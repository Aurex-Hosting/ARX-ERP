<style>
    .click-particle {
        position: fixed;
        width: 10px;
        height: 3px;
        border-radius: 2px;
        pointer-events: none;
        z-index: 999999;
        animation: flickAnim 0.4s ease-out forwards;
        transform-origin: center;
    }
    @keyframes flickAnim {
        0% {
            transform: translate(var(--tx-start), var(--ty-start)) rotate(var(--rot)) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(var(--tx-end), var(--ty-end)) rotate(var(--rot)) scale(0.2);
            opacity: 0;
        }
    }
</style>
<script>
    document.addEventListener('click', function(e) {
        const numParticles = 8;
        const colors = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'click-particle';
            particle.style.backgroundColor = color;
            
            // Calculate angle
            const angle = (i / numParticles) * Math.PI * 2;
            
            // Radius distances
            const radiusStart = 10;
            const radiusEnd = 35;
            
            // The position is fixed relative to top-left (0,0), so we translate to cursor + offset
            const startX = e.clientX + Math.cos(angle) * radiusStart - 5; // -5 to center the 10px width
            const startY = e.clientY + Math.sin(angle) * radiusStart - 1.5; // -1.5 to center the 3px height
            
            const endX = e.clientX + Math.cos(angle) * radiusEnd - 5;
            const endY = e.clientY + Math.sin(angle) * radiusEnd - 1.5;
            
            particle.style.left = '0px';
            particle.style.top = '0px';
            
            particle.style.setProperty('--tx-start', startX + 'px');
            particle.style.setProperty('--ty-start', startY + 'px');
            particle.style.setProperty('--tx-end', endX + 'px');
            particle.style.setProperty('--ty-end', endY + 'px');
            particle.style.setProperty('--rot', (angle * 180 / Math.PI) + 'deg');

            document.body.appendChild(particle);

            // Cleanup
            setTimeout(() => {
                if(document.body.contains(particle)) {
                    particle.remove();
                }
            }, 400);
        }
    });
</script>
