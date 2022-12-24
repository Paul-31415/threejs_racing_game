import {expose, transfer, proxy, Remote} from "comlink";
import * as THREE from "three";
import { MeshWorker, tcol, terrains, } from "./interface.js";

async function spiral_raster_geometry(terrain_key:string,pos:{x:number,y:number,z:number}){
    const ter = terrains.get(terrain_key)??((x,y)=>0);
    const b = new THREE.BufferGeometry()
    const pts: THREE.Vector3[] = [];
    /*for (let x = -100; x <= 100; x++) {
        for (let y = -100; y <= 100; y++) {
            const z1 = ter(x, y);
            const z2 = ter(x + 1, y);
            const z3 = ter(x, y + 1);
            const z4 = ter(x + 1, y + 1);
            pts.push(new THREE.Vector3(x, y, z1),
                new THREE.Vector3(x + 1, y, z2),
                new THREE.Vector3(x, y + 1, z3),
                new THREE.Vector3(x, y + 1, z3),
                new THREE.Vector3(x + 1, y, z2),
                new THREE.Vector3(x + 1, y + 1, z4));
        }
    }*/
    const res_scale = 1;//smaller is higher res
    
    
    const start = performance.now();

    const res = (Math.abs(pos.z)/100+1)
    
    const rd = 1024 * res;
    const rn = res / 16;
    const aangle = 2 * Math.PI / 1024.5 * res_scale;
    const near_res = res / 4;
    const hyperexp = res * res_scale * 16;
    const res_transition_dist = 32;
    const angular_resolution = function(r: number): number {
        //want something that gracefully transitions from 1/r to 1
        //return Math.pow(r / near_res, Math.min(0, r / res_transition_dist - 1)) * aangle;
        //old version
        //return Math.max(aangle, near_res / r);
        return Math.max(Math.max(aangle , near_res / r), aangle * (r / hyperexp)**0.5);
    }
    // 2π/angle steps per circle, want mag^steps = 1+angle
    // so mag = e^(log1p(angle)/steps)
    let angle = angular_resolution(rn);
    let mag = Math.exp(angle * Math.log1p(angle) / 2 / Math.PI);
    let mat = [mag * Math.cos(angle), -mag * Math.sin(angle), mag * Math.sin(angle), mag * Math.cos(angle)];

    //spiral terrain		
    const oldps: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
        const x = [0, -1, 0, 1][i] * rn;
        const y = [-1, 0, 1, 0][i] * rn;
        oldps.push(new THREE.Vector3(x, y, ter(x+pos.x, y+pos.y)));
    }
    pts.push(oldps[3], oldps[1], oldps[0],
        oldps[1], oldps[3], oldps[2]);
    let pi = 0;

    for (let p = new THREE.Vector2(rn, rn); p.lengthSq() < rd * rd; p.set(p.x * mat[0] + p.y * mat[2], p.x * mat[1] + p.y * mat[3])) {
        angle = angular_resolution(p.length());
        mag = Math.exp(angle * Math.log1p(angle) / 2 / Math.PI);
        mat = [mag * Math.cos(angle), -mag * Math.sin(angle), mag * Math.sin(angle), mag * Math.cos(angle)];

        const z = ter(p.x+pos.x, p.y+pos.y);
        const prev = oldps[oldps.length - 1];
        const cur = new THREE.Vector3(p.x, p.y, z);
        let old = oldps[pi];
        //let next = oldps[pi + 1];
        oldps.push(cur);
        while ((old.x * mat[0] + old.y * mat[2]) * cur.y - (old.x * mat[1] + old.y * mat[3]) * cur.x < 0) {
            let next = oldps[++pi];
            pts.push(old, next, prev);
            //console.log("adding inner triangle:");
            //console.log({ a: old, b: next, c: prev });
            old = next;
            if (next === undefined) {
                throw next;
            }
        }
        //console.log("adding outer triangle:");
        //console.log({ a: prev, b: old, c: cur });
        pts.push(prev, old, cur);
    }
    b.setFromPoints(pts);
    b.computeVertexNormals();
    const end = performance.now();
    //console.log("added " + (pts.length / 3) + " triangles. time:" + (end - start));

    //console.log("coloring triangles");
    const count = b.attributes.position.count;
    b.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    for (let i = 0; i < count; i++) {
        const col = tcol(b.attributes.position.getX(i)+pos.x, b.attributes.position.getY(i)+pos.y);
        b.attributes.color.setXYZ(i, col.r, col.g, col.b);
    }

    //const material = new THREE.MeshStandardMaterial({ vertexColors: true });
    //const grund = new THREE.Mesh(b, material);
    //outMesh.material = material;
    //outMesh.geometry = b;
    // https://discourse.threejs.org/t/trouble-reconstructing-geometry-from-web-worker/21423
    const abufs = [];
    const aatrs:any[] = [{},{}];
    for (let k of Object.keys( b.attributes )){
        abufs.push((b.attributes[k].array as any).buffer);
        aatrs[0][k] = (b.attributes[k].array as any);
        aatrs[1][k] = b.attributes[k].itemSize;
    }
    return transfer(aatrs,abufs);

}


const api:MeshWorker = {spiral_raster_geometry};
expose(api);

