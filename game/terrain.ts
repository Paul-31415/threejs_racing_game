//

import { Resource } from "nova_ecs/resource";
import { Component } from "nova_ecs/component";
import { Provide } from "nova_ecs/provider";
import { System } from "nova_ecs/system";
import { EcsEvent } from "nova_ecs/events";
import { Emit } from "nova_ecs/arg_types";
import { Plugin } from "nova_ecs/plugin";
import * as THREE from "three";


export const HeightMapComponent = new Component<{
    resolution: number,
    height: (x: number, y: number) => number,
}>({ name: "Height Map" });
export const HeightMapGeometry = new Component<{
    geo: THREE.BufferGeometry,
    target: THREE.Vector3,
    current: THREE.Vector3,
}>({ name: "hm geometry" });
export const HeightMapTriangulator = new System({
    name: "hm triangulator",
    args: [HeightMapComponent, HeightMapGeometry,] as const,
    step: (h, hg) => {
        const dif = new THREE.Vector3().subVectors(hg.target, hg.current);


    }
});

/*
const b = new THREE.BufferGeometry()
const pts: THREE.Vector3[] = [];
for (let x = -100; x <= 100; x++) {
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
}
b.setFromPoints(pts);
b.computeVertexNormals();
const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
const grund = new THREE.Mesh(b, material);
three_scene.add(grund);
}
*/
