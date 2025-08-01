<template>
    <div class="loading-container">
        <div class="ripple-container">
            <span class="ripple"></span>
            <span class="ripple delay1"></span>
            <span class="ripple delay2"></span>
        </div>
    </div>
</template>

<style scoped>
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.ripple-container {
    position: relative;
    width: 100px;
    height: 100px;
}

.ripple {
    position: absolute;
    border: 5px solid black;
    border-radius: 50%;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    opacity: 0;
    animation: ripple 2s infinite;
}

.ripple.delay1 {
    animation-delay: 0.5s;
}

.ripple.delay2 {
    animation-delay: 1s;
}

@keyframes ripple {
    0% {
        transform: scale(0);
        opacity: 1;
    }

    70% {
        transform: scale(1);
        opacity: 0;
    }

    100% {
        transform: scale(1.1);
        opacity: 0;
    }
}
</style>
