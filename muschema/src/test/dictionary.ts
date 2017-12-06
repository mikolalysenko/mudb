import test = require('tape');

import {
    MuBoolean,
    MuDictionary,
    MuFloat64,
    MuString,
    MuStruct,
    MuUint8,
    MuVoid,
} from '../index';
import { MuWriteStream, MuReadStream } from 'mustreams';

interface Dict {
    [key:string]:any;
}

test('simple dictionary', (t) => {
    const d0 = new MuDictionary(new MuVoid());

    t.same(d0.identity, {});
    t.equals(d0.muType, 'dictionary');
    t.equals(d0.muData.muType, 'void');
    t.same(d0.alloc(), {});

    const confession = {
        married: true,
        hadAffairs: true,
        havingAnAffair: true,
    };
    const d1 = new MuDictionary(new MuBoolean(), confession);

    t.equals(d1.identity, confession);
    t.equals(d1.muType, 'dictionary');
    t.equals(d1.muData.muType, 'boolean');
    t.same(d1.alloc(), {});
    t.notEquals(d1.clone(confession), confession);
    t.same(d1.clone(confession), confession);

    const groceryList:Dict = {
        gin: 0xFF,
        wisky: 0xFF,
        vodka: 0xFF,
    };
    const groceryListCopy = shallowCopy(groceryList);
    const d2 = new MuDictionary(new MuUint8(), groceryList);

    t.equals(d2.identity, groceryList);
    t.equals(d2.muData.muType, 'uint8');
    t.same(d2.alloc(), {});
    t.notEquals(d2.clone(groceryList), groceryList);
    t.same(d2.clone(groceryList), groceryList);

    let ws = new MuWriteStream(2);
    t.equals(d2.diffBinary(groceryList, {}, ws), true);
    let rs = new MuReadStream(ws);
    t.same(d2.patchBinary(groceryList, rs), {});
    t.same(groceryList, groceryListCopy);

    ws = new MuWriteStream(2);
    t.equals(d2.diffBinary(groceryList, { gin: 0xFF }, ws), true);
    rs = new MuReadStream(ws);
    t.same(d2.patchBinary(groceryList, rs), { gin: 0xFF });
    t.same(groceryList, groceryListCopy);

    ws = new MuWriteStream(2);
    t.equals(d2.diffBinary(groceryList, { gin: 0xFF, wisky: 0xFF }, ws), true);
    rs = new MuReadStream(ws);
    t.same(d2.patchBinary(groceryList, rs), { gin: 0xFF, wisky: 0xFF });
    t.same(groceryList, groceryListCopy);

    ws = new MuWriteStream(2);
    t.equals(d2.diffBinary(groceryList, groceryList, ws), false);
    rs = new MuReadStream(ws);
    t.same(d2.patchBinary(groceryList, rs), groceryList);

    const coordinate = {
        x: 12.34,
        y: 56.78,
        z: 90.12,
    };
    const coordinateCopy = shallowCopy(coordinate);
    const d3 = new MuDictionary(new MuFloat64(), coordinate);

    t.equals(d3.identity, coordinate);
    t.equals(d3.muData.muType, 'float64');
    t.notEquals(d3.clone(coordinate), coordinate);
    t.same(d3.clone(coordinate), coordinate);

    ws = new MuWriteStream(2);
    t.equals(d3.diffBinary(coordinate, coordinate, ws), false, 'sit still');
    rs = new MuReadStream(ws);
    t.same(d3.patchBinary(coordinate, rs), coordinate);

    ws = new MuWriteStream(2);
    let newCoordinate = { x: 12.34, y: 60, z: 90.12 };
    t.equals(d3.diffBinary(coordinate, newCoordinate, ws), true, 'move north');
    rs = new MuReadStream(ws);
    t.same(d3.patchBinary(coordinate, rs), newCoordinate);
    t.same(coordinate, coordinateCopy);

    ws = new MuWriteStream(2);
    newCoordinate = { x: 12.35, y: 60, z: 90.12 };
    t.equals(d3.diffBinary(coordinate, newCoordinate, ws), true, 'move northeast');
    rs = new MuReadStream(ws);
    t.same(d3.patchBinary(coordinate, rs), newCoordinate);
    t.same(coordinate, coordinateCopy);

    ws = new MuWriteStream(2);
    newCoordinate = { x: 12.35, y: 60, z: -90.12 };
    t.equals(d3.diffBinary(coordinate, newCoordinate, ws), true, 'move northeast under the surface');
    rs = new MuReadStream(ws);
    t.same(d3.patchBinary(coordinate, rs), newCoordinate);
    t.same(coordinate, coordinateCopy);

    const friends = {
        mik: 'Mikola Lysenko',
        peter: 'Peter Thiel',
        rick: 'Rick',
    };
    const friendsCopy = shallowCopy(friends);
    const d4 = new MuDictionary(new MuString(), friends);

    t.equals(d4.identity, friends);
    t.equals(d4.muData.muType, 'string');
    t.notEquals(d4.clone(friends), friends);
    t.same(d4.clone(friends), friends);

    ws = new MuWriteStream(2);
    const newFriends = { mik: 'Mikola Lysenko', rick: 'Rick Sanchez' };
    t.equals(d4.diffBinary(friends, newFriends, ws), true, `unfriend peter and add rick's last name`);
    rs = new MuReadStream(ws);
    t.same(d4.patchBinary(friends, rs), newFriends);
    t.same(friends, friendsCopy);

    t.end();
});

test('dictionary-struct', (t) => {
    // TODO

    t.end();
});

function shallowCopy (obj) {
    const result = {};
    for (const prop in obj) {
        result[prop] = obj[prop];
    }
    return result;
}

function deepCopy (obj) {
    const result = {};
    for (const prop in obj) {
        const v = obj[prop];
        result[prop] = (typeof v === 'object') ? deepCopy(v) : v;
    }
    return result;
}
