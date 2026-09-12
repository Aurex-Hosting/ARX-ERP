<div>
    <div class="mb-4">
        <h3 class="text-lg font-medium">{{ $record->description }}</h3>
        <p class="text-sm text-gray-500">{{ $record->created_at->format('M d, Y H:i:s') }} - By {{ $record->causer ? (method_exists($record->causer, 'getFilamentName') ? $record->causer->getFilamentName() : ($record->causer->name ?? 'System')) : 'System' }} (IP: {{ $record->ip_address ?? 'N/A' }})</p>
    </div>

    @if(isset($record->properties['old']))
        <div class="grid grid-cols-2 gap-4">
            <div>
                <h4 class="font-semibold mb-2 text-red-500">Old Values</h4>
                <pre class="bg-gray-900 text-gray-200 p-4 rounded-lg text-sm overflow-x-auto">{{ json_encode($record->properties['old'], JSON_PRETTY_PRINT) }}</pre>
            </div>
            <div>
                <h4 class="font-semibold mb-2 text-green-500">New Values</h4>
                <pre class="bg-gray-900 text-gray-200 p-4 rounded-lg text-sm overflow-x-auto">{{ json_encode($record->properties['attributes'] ?? [], JSON_PRETTY_PRINT) }}</pre>
            </div>
        </div>
    @else
        <div>
            <h4 class="font-semibold mb-2">Attributes</h4>
            <pre class="bg-gray-900 text-gray-200 p-4 rounded-lg text-sm overflow-x-auto">{{ json_encode($record->properties['attributes'] ?? $record->properties, JSON_PRETTY_PRINT) }}</pre>
        </div>
    @endif
</div>
