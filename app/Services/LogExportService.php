<?php

namespace App\Services;

use App\Models\Activity;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class LogExportService
{
    public static function exportTimeframe($timeframe)
    {
        $query = Activity::query();
        $now = Carbon::now();
        
        switch ($timeframe) {
            case 'today':
                $query->whereDate('created_at', $now->today());
                break;
            case '3_days':
                $query->where('created_at', '>=', $now->copy()->subDays(3));
                break;
            case 'week':
                $query->where('created_at', '>=', $now->copy()->subWeek());
                break;
            case 'month':
                $query->where('created_at', '>=', $now->copy()->subMonth());
                break;
            case 'year':
                $query->where('created_at', '>=', $now->copy()->subYear());
                break;
            case 'all':
            default:
                break;
        }

        return self::generateZip($query->get());
    }

    public static function exportRecords($records)
    {
        return self::generateZip($records);
    }

    public static function generateZip($activities)
    {
        if ($activities->isEmpty()) {
            \Filament\Notifications\Notification::make()->title('No logs found')->warning()->send();
            return;
        }

        // Group by Year-Month
        $grouped = $activities->groupBy(function ($activity) {
            return Carbon::parse($activity->created_at)->format('Y-F');
        });

        $zipPath = storage_path('app/temp_logs_' . time() . '.zip');
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            foreach ($grouped as $month => $logs) {
                $content = "";
                foreach ($logs as $log) {
                    $causer = $log->causer ? $log->causer->name : 'System';
                    $content .= "[{->created_at}] - {->description}\n";
                    $content .= "Causer: {} | IP: {->ip_address}\n";
                    $content .= "Properties:\n" . json_encode($log->properties, JSON_PRETTY_PRINT) . "\n";
                    $content .= "--------------------------------------------------------\n\n";
                }
                $zip->addFromString($month . '.log', $content);
            }
            $zip->close();
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    public static function massDelete($criteria)
    {
        $query = Activity::query();
        $now = Carbon::now();

        switch ($criteria) {
            case 'last_month':
                $query->where('created_at', '>=', $now->copy()->subMonth());
                break;
            case 'last_year':
                $query->where('created_at', '>=', $now->copy()->subYear());
                break;
            case 'last_7_days':
                $query->where('created_at', '>=', $now->copy()->subDays(7));
                break;
            case 'except_last_week':
                $query->where('created_at', '<', $now->copy()->subWeek());
                break;
            case 'except_last_month':
                $query->where('created_at', '<', $now->copy()->subMonth());
                break;
            case 'except_last_year':
                $query->where('created_at', '<', $now->copy()->subYear());
                break;
            case 'all':
            default:
                break;
        }

        $query->delete();
    }
}
