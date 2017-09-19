let lastTime = 0;

const sampleTime = () => {
    return Date.now();
}

export default function () {
    return lastTime = Math.max(lastTime + 1e-4, sampleTime());
}