export class PQEvent {
    public id:number;
    public time:number;
    public event:() => void;
    public parent:PQEvent;
    public left:PQEvent;
    public right:PQEvent;

    constructor (id:number, time:number, event:() => void, parent:PQEvent, left:PQEvent, right:PQEvent) {
        this.id = id;
        this.time = time;
        this.event = event;
        this.parent = parent;
        this.left = left;
        this.right = right;
    }
}

export const NIL = new PQEvent(-1, -Infinity, () => {}, <any>null, <any>null, <any>null);
NIL.parent = NIL.left = NIL.right = NIL;

function link (a:PQEvent, b:PQEvent) {
    b.right = a.left;
    a.left.parent = b;
    a.left = b;
    b.parent = a;
    a.right = NIL;
    return a;
}

export function merge (a:PQEvent, b:PQEvent) {
    if (a === NIL) {
        return b;
    } else if (b === NIL) {
        return a;
    } else if (a.time < b.time) {
        return link(a, b);
    } else {
        return link(b, a);
    }
}

export function pop (root:PQEvent) {
    let p = root.left;
    root.left = NIL;
    root = p;
    while (true) {
        let q = root.right;
        if (q === NIL) {
            break;
        }
        p = root;
        let r = q.right;
        let s = merge(p, q);
        root = s;
        while (true) {
            p = r;
            q = r.right;
            if (q === NIL) {
                break;
            }
            r = q.right;
            s = s.right = merge(p, q);
        }
        s.right = NIL;
        if (p !== NIL) {
            p.right = root;
            root = p;
        }
    }
    root.parent = NIL;
    return root;
}

export function decreaseKey (root:PQEvent, p:PQEvent, time:number) {
    p.time = time;
    const q = p.parent;
    if  (q.time < p.time) {
        return root;
    }
    const r = p.right;
    r.parent = q;
    if (q.left === p) {
        q.left = r;
    } else {
        q.right = r;
    }
    if (root.time <= p.time) {
        const l = root.left;
        l.parent = p;
        p.right = l;
        root.left = p;
        p.parent = root;
        return root;
    } else {
        const l = p.left;
        root.right = l;
        l.parent = root;
        p.left = root;
        root.parent = p;
        p.right = p.parent = NIL;
        return p;
    }
}

export function createNode (id:number, time:number, event:() => void) {
    return new PQEvent(id, time, event, NIL, NIL, NIL);
}
