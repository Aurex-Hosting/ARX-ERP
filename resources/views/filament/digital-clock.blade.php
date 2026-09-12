<div
    x-data="{
        time: '',
        updateTime() {
            const now = new Date();
            this.time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }"
    x-init="updateTime(); setInterval(() => updateTime(), 1000)"
    class="flex items-center justify-center px-4 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-950/10 dark:ring-white/20 mx-4 h-9"
    x-text="time"
>
</div>
