<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    <div x-data="{ state: $wire.$entangle('{{ $getStatePath() }}').live }" style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1rem;">
        
        <!-- Default Theme -->
        <button type="button" @click="state = 'default'" 
                :style="state === 'default' ? 'box-shadow: 0 0 0 2px #18181b, 0 0 0 4px #f59e0b;' : ''"
                style="width: 130px; height: 110px; background-color: #4b5563; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                onmouseover="this.style.transform='scale(1.05)';" 
                onmouseout="this.style.transform='scale(1)';">
            
            <div style="display: flex; width: 100px; height: 36px; border-radius: 9999px; overflow: hidden; margin-bottom: 10px;">
                <div style="flex: 1; background-color: #f59e0b;"></div> <!-- Primary -->
                <div style="flex: 1; background-color: #71717a;"></div> <!-- Secondary -->
                <div style="flex: 1; background-color: #fbbf24;"></div> <!-- Accent -->
                <div style="flex: 1; background-color: #18181b;"></div> <!-- Background -->
            </div>

            <span style="font-size: 14px; font-weight: 900; color: #f3f4f6; letter-spacing: 0.05em; text-transform: uppercase; font-family: ui-sans-serif, system-ui, sans-serif;">Default</span>
        </button>

        <!-- Custom Theme -->
        <button type="button" @click="state = 'custom'" 
                :style="state === 'custom' ? 'box-shadow: 0 0 0 2px #18181b, 0 0 0 4px #f59e0b;' : ''"
                style="width: 130px; height: 110px; background-color: #4b5563; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;"
                onmouseover="this.style.transform='scale(1.05)';" 
                onmouseout="this.style.transform='scale(1)';">
            
            <div style="display: flex; align-items: center; justify-content: center; width: 100px; height: 36px; border-radius: 9999px; background-color: #374151; border: 2px dashed #9ca3af; margin-bottom: 10px; box-sizing: border-box;">
                <svg style="width: 18px; height: 18px; color: #d1d5db;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
            </div>

            <span style="font-size: 14px; font-weight: 900; color: #f3f4f6; letter-spacing: 0.05em; text-transform: uppercase; font-family: ui-sans-serif, system-ui, sans-serif;">Custom</span>
        </button>
        
    </div>
</x-dynamic-component>
