<div x-data="{
    selected: @entangle('themeData.dashboard_card_style'),
    options: [
        { id: 'stacked', label: 'Stacked', desc: 'Full width cards per row', svg: 'stacked' },
        { id: 'two_column', label: '2 Column Grid', desc: 'Two cards per row', svg: 'two_col' },
        { id: 'three_column', label: '3 Column Grid', desc: 'Three cards per row', svg: 'three_col' },
        { id: 'random', label: 'Random', desc: 'Dynamic auto-sized widths', svg: 'random' }
    ]
}" class="grid grid-cols-2 gap-3">
    <template x-for="opt in options" :key="opt.id">
        <div 
            @click="selected = opt.id; $wire.set('themeData.dashboard_card_style', opt.id)"
            :class="selected === opt.id ? 'border-primary-500 bg-primary-950/30 ring-1 ring-primary-500' : 'border-white/10 bg-white/5 hover:border-white/20'"
            class="cursor-pointer rounded-xl border p-3 transition-all flex flex-col items-center text-center group"
        >
            <div class="w-full h-16 rounded-lg bg-black/40 mb-2 p-1.5 flex items-center justify-center overflow-hidden border border-white/5">
                <!-- Stacked SVG -->
                <template x-if="opt.svg === 'stacked'">
                    <div class="w-full h-full flex flex-col gap-1 justify-center p-1">
                        <div class="w-full h-3 bg-primary-500/60 rounded-xs"></div>
                        <div class="w-full h-3 bg-primary-500/40 rounded-xs"></div>
                        <div class="w-full h-3 bg-primary-500/20 rounded-xs"></div>
                    </div>
                </template>

                <!-- Two Column SVG -->
                <template x-if="opt.svg === 'two_col'">
                    <div class="w-full h-full grid grid-cols-2 gap-1 p-1">
                        <div class="bg-primary-500/60 rounded-xs h-full"></div>
                        <div class="bg-primary-500/50 rounded-xs h-full"></div>
                        <div class="bg-primary-500/40 rounded-xs h-full"></div>
                        <div class="bg-primary-500/30 rounded-xs h-full"></div>
                    </div>
                </template>

                <!-- Three Column SVG -->
                <template x-if="opt.svg === 'three_col'">
                    <div class="w-full h-full grid grid-cols-3 gap-0.5 p-1">
                        <div class="bg-primary-500/60 rounded-xs h-full"></div>
                        <div class="bg-primary-500/50 rounded-xs h-full"></div>
                        <div class="bg-primary-500/40 rounded-xs h-full"></div>
                        <div class="bg-primary-500/40 rounded-xs h-full"></div>
                        <div class="bg-primary-500/30 rounded-xs h-full"></div>
                        <div class="bg-primary-500/20 rounded-xs h-full"></div>
                    </div>
                </template>

                <!-- Random SVG -->
                <template x-if="opt.svg === 'random'">
                    <div class="w-full h-full flex flex-col gap-1 p-1">
                        <div class="flex gap-1 h-1/2">
                            <div class="w-2/3 bg-primary-500/70 rounded-xs"></div>
                            <div class="w-1/3 bg-primary-500/40 rounded-xs"></div>
                        </div>
                        <div class="flex gap-1 h-1/2">
                            <div class="w-1/3 bg-primary-500/30 rounded-xs"></div>
                            <div class="w-2/3 bg-primary-500/50 rounded-xs"></div>
                        </div>
                    </div>
                </template>
            </div>
            <span class="text-xs font-semibold text-white group-hover:text-primary-400" x-text="opt.label"></span>
            <span class="text-[10px] text-gray-400 mt-0.5 line-clamp-1" x-text="opt.desc"></span>
        </div>
    </template>
</div>
