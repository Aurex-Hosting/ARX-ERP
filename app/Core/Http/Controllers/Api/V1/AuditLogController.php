<?php

declare(strict_types=1);

namespace App\Core\Http\Controllers\Api\V1;

use App\Core\Models\AuditLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

/**
 * Controller providing searchable, filterable access to the audit trail,
 * as well as date-range export (ZIP) and cleanup actions.
 */
class AuditLogController extends Controller
{
    /**
     * Search and paginate audit logs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,identifier,name,email,user_type')->latest('id');

        if ($request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', $search)
                    ->orWhere('action', 'like', $search)
                    ->orWhere('user_identifier', 'like', $search)
                    ->orWhere('model_identifier', 'like', $search)
                    ->orWhere('ip_address', 'like', $search)
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', $search)
                            ->orWhere('email', 'like', $search)
                            ->orWhere('identifier', 'like', $search);
                    });
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('user_type')) {
            $query->where('user_type', $request->string('user_type'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('model_type')) {
            $query->where('model_type', $request->string('model_type'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        $perPage = min($request->integer('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Show a specific audit log entry.
     */
    public function show(int $id): JsonResponse
    {
        $log = AuditLog::with('user:id,name,email,user_type')->findOrFail($id);

        return response()->json([
            'log' => $log,
        ]);
    }

    /**
     * Delete a single audit log entry by ID.
     */
    public function destroySingle(int $id): JsonResponse
    {
        $log = AuditLog::findOrFail($id);
        $log->delete();

        return response()->json([
            'message' => "Audit log entry #{$id} deleted successfully.",
        ]);
    }

    /**
     * Delete a batch of audit logs by IDs.
     */
    public function batchDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:audit_logs,id'],
        ]);

        $count = AuditLog::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'message' => "Successfully deleted {$count} audit log record(s).",
            'deleted_count' => $count,
        ]);
    }

    /**
     * Delete audit logs by date range or all.
     */
    public function destroy(Request $request): JsonResponse
    {
        $deleteAll = $request->boolean('all');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $query = AuditLog::query();

        if (! $deleteAll) {
            if (! $fromDate && ! $toDate) {
                return response()->json([
                    'message' => 'Please provide from_date and to_date or pass all=true.',
                ], 422);
            }

            if ($fromDate) {
                $query->whereDate('created_at', '>=', $fromDate);
            }
            if ($toDate) {
                $query->whereDate('created_at', '<=', $toDate);
            }
        }

        $count = $query->count();
        $query->delete();

        return response()->json([
            'message' => "Successfully deleted {$count} audit log records.",
            'deleted_count' => $count,
        ]);
    }

    /**
     * Export audit logs as a ZIP archive containing JSON and CSV dumps.
     */
    public function export(Request $request): BinaryFileResponse|JsonResponse
    {
        $exportAll = $request->boolean('all');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $query = AuditLog::with('user:id,name,email,user_type')->latest('id');

        if (! $exportAll) {
            if ($fromDate) {
                $query->whereDate('created_at', '>=', $fromDate);
            }
            if ($toDate) {
                $query->whereDate('created_at', '<=', $toDate);
            }
        }

        $logs = $query->get();

        if ($logs->isEmpty()) {
            return response()->json([
                'message' => 'No audit logs found for the specified criteria to export.',
            ], 404);
        }

        $tempDir = storage_path('app/temp/exports');
        File::ensureDirectoryExists($tempDir);

        $timestamp = now()->format('Y_m_d_His');
        $zipFileName = "audit_logs_export_{$timestamp}.zip";
        $zipPath = "{$tempDir}/{$zipFileName}";

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'message' => 'Could not create export archive.',
            ], 500);
        }

        // 1. Add JSON formatted logs
        $jsonContent = $logs->toJson(JSON_PRETTY_PRINT);
        $zip->addFromString('audit_logs.json', $jsonContent);

        // 2. Add CSV formatted logs
        $csvHandle = fopen('php://memory', 'r+');
        fputcsv($csvHandle, ['ID', 'Actor Name', 'Actor Email', 'User Type', 'Action', 'Target Model', 'Model ID', 'IP Address', 'User Agent', 'Created At']);

        foreach ($logs as $log) {
            fputcsv($csvHandle, [
                $log->id,
                $log->user?->name ?? 'System',
                $log->user?->email ?? 'system@arx-erp.local',
                $log->user_type,
                $log->action,
                $log->model_type ?? 'N/A',
                $log->model_id ?? 'N/A',
                $log->ip_address ?? '127.0.0.1',
                $log->user_agent ?? 'N/A',
                $log->created_at->toIso8601String(),
            ]);
        }

        rewind($csvHandle);
        $csvContent = stream_get_contents($csvHandle);
        fclose($csvHandle);

        $zip->addFromString('audit_logs.csv', $csvContent ?: '');
        $zip->close();

        return response()->download($zipPath, $zipFileName, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }
}
