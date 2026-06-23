import imagesLoaded from 'imagesloaded';

export const preloadImages = (selector = 'img') => {
    return new Promise((resolve) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
            resolve(null);
            return;
        }
        imagesLoaded(elements, {background: true}, resolve);
    });
};

export const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

export const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

export const getPointerPos = (ev: any) => {
    let posx = 0;
    let posy = 0;
    if (!ev) ev = window.event;
    if (ev.touches) {
        if (ev.touches.length > 0) {
            posx = ev.touches[0].pageX;
            posy = ev.touches[0].pageY;
        }
    } else if (ev.pageX || ev.pageY) {
        posx = ev.pageX;
        posy = ev.pageY;
    } else if (ev.clientX || ev.clientY) {
        posx = ev.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = ev.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    return {x: posx, y: posy};
}

export const getMouseDistance = (mousePos: {x: number, y: number}, lastMousePos: {x: number, y: number}) => {
    return distance(mousePos.x, mousePos.y, lastMousePos.x, lastMousePos.y);
};
