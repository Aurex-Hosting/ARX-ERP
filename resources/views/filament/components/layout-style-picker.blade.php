<div x-data="{
    selected: @entangle('themeData.layout_style'),
    options: [
        { id: 'default', label: 'Default', desc: 'Standard sidebar on the left', svg: 'default' },
        { id: 'navbar', label: 'Navbar', desc: 'Horizontal navigation at the top', svg: 'navbar' },
        { id: 'floating', label: 'Floating Sidebar', desc: 'Floating sidebar with rounded edges', svg: 'floating' },
        { id: 'bottom_bar', label: 'Bottom Bar', desc: 'Navigation pinned at the bottom', svg: 'bottom_bar' }
    ]
}" class="grid grid-cols-2 gap-3">
    <template x-for="opt in options" :key="opt.id">
        <div 
            @click="selected = opt.id; $wire.set('themeData.layout_style', opt.id)"
            :class="selected === opt.id ? 'border-primary-500 bg-primary-950/30 ring-1 ring-primary-500' : 'border-white/10 bg-white/5 hover:border-white/20'"
            class="cursor-pointer rounded-xl border p-3 transition-all flex flex-col items-center text-center group"
        >
            <div class="w-full h-16 rounded-lg bg-black/40 mb-2 p-1.5 flex items-center justify-center overflow-hidden border border-white/5">
                <!-- Default Sidebar SVG -->
                <template x-if="opt.svg === 'default'">
                    <div class="w-full h-full flex gap-1 items-center">
                        <div class="w-1/4 h-full bg-primary-600/80 rounded-sm flex flex-col gap-0.5 p-0.5">
                            <div class="w-full h-1 bg-white/30 rounded-xs"></div>
                            <div class="w-2/3 h-0.5 bg-white/20 rounded-xs"></div>
                            <div class="w-3/4 h-0.5 bg-white/20 rounded-xs"></div>
                        </div>
                        <div class="w-3/4 h-full flex flex-col gap-1">
                            <div class="w-full h-2 bg-white/10 rounded-sm"></div>
                            <div class="w-full h-full bg-white/5 rounded-sm p-1 grid grid-cols-2 gap-0.5">
                                <div class="bg-white/10 rounded-xs"></div>
                                <div class="bg-white/10 rounded-xs"></div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Navbar SVG -->
                <template x-if="opt.svg === 'navbar'">
                    <div class="w-full h-full flex flex-col gap-1">
                        <div class="w-full h-2.5 bg-primary-600/80 rounded-sm flex items-center gap-1 px-1">
                            <div class="w-2 h-1 bg-white/50 rounded-xs"></div>
                            <div class="w-3 h-1 bg-white/30 rounded-xs"></div>
                            <div class="w-3 h-1 bg-white/30 rounded-xs"></div>
                        </div>
                        <div class="w-full h-full bg-white/5 rounded-sm p-1 grid grid-cols-2 gap-0.5">
                            <div class="bg-white/10 rounded-xs"></div>
                            <div class="bg-white/10 rounded-xs"></div>
                        </div>
                    </div>
                </template>

                <!-- Floating Sidebar SVG -->
                <template x-if="opt.svg === 'floating'">
                    <div class="w-full h-full flex gap-1.5 items-center p-0.5">
                        <div class="w-1/4 h-[85%] bg-primary-600/80 rounded-md shadow flex flex-col gap-0.5 p-0.5">
                            <div class="w-full h-1 bg-white/40 rounded-xs"></div>
                            <div class="w-2/3 h-0.5 bg-white/20 rounded-xs"></div>
                        </div>
                        <div class="w-3/4 h-full flex flex-col gap-1">
                            <div class="w-full h-2 bg-white/10 rounded-sm"></div>
                            <div class="w-full h-full bg-white/5 rounded-sm p-1">
                                <div class="w-full h-full bg-white/10 rounded-xs"></div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Bottom Bar SVG -->
                <template x-if="opt.svg === 'bottom_bar'">
                    <div class="w-full h-full flex flex-col gap-1">
                        <div class="w-full h-full bg-white/5 rounded-sm p-1">
                            <div class="w-full h-full bg-white/10 rounded-xs"></div>
                        </div>
                        <div class="w-full h-2.5 bg-primary-600/80 rounded-sm flex items-center justify-around px-1">
                            <div class="w-2 h-1 bg-white/40 rounded-xs"></div>
                            <div class="w-2 h-1 bg-white/40 rounded-xs"></div>
                            <div class="w-2 h-1 bg-white/40 rounded-xs"></div>
                        </div>
                    </div>
                </template>
            </div>
            <span class="text-xs font-semibold text-white group-hover:text-primary-400" x-text="opt.label"></span>
            <span class="text-[10px] text-gray-400 mt-0.5 line-clamp-1" x-text="opt.desc"></span>
        </div>
    </template>
</div>
