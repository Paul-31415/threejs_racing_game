//
//import * as PIXI from "pixi.js";
import { Emit } from "nova_ecs/arg_types";
import { Component } from "nova_ecs/component";
import { Entity } from "nova_ecs/entity";
import { TimePlugin, TimeResource } from "nova_ecs/plugins/time_plugin";
import { Provide } from "nova_ecs/provider";
import { Resource } from "nova_ecs/resource";
import { System } from "nova_ecs/system";
import { SingletonComponent, World } from "nova_ecs/world";
import * as THREE from "three";
import { InputPlugin, keyboardState, mousemove, wheel } from "./input.js";
import { wrap } from "comlink";
import { MeshWorker, ter, terrains } from "./interface.js";
import { AsyncSystem } from "nova_ecs/async_system.js";
import * as Dat from "dat.gui";

const GUI = new Dat.GUI();
const state = {terrain:"current"};
GUI.add(state,"terrain",[... terrains.keys()]).onChange((s)=>{
    console.log(state);
});
const grabMouse = {capture_mouse:function(){three_renderer.domElement.requestPointerLock();}};
GUI.add(grabMouse,"capture_mouse");


console.log('hello');

//from getting started in the docs
var fov = 90;
let three_scene = new THREE.Scene();
let three_renderer = new THREE.WebGLRenderer({ alpha: false });
three_renderer.setSize(window.innerWidth, window.innerHeight);
three_renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);


three_scene.add(new THREE.AmbientLight(0x101010));

for (let i = 0; i < 4; i++) {
    const l = new THREE.DirectionalLight([0xffffff, 0xaabbcc, 0x882255, 0x885533][i],
        [1, .5, .4, .3][i]);


    l.position.x = [2, -4, 13, 10][i];
    l.position.z = [9, -3, -9, -9][i];
    l.position.y = [1, -2, 10, -2][i];

    three_scene.add(l);
}



//let pixi_renderer = PIXI.autoDetectRenderer({ transparent: true });

// const app: PIXI.Application = new PIXI.Application(
//     {
//         width: window.innerWidth,
//         height: window.innerHeight,
//         backgroundColor: 0x000000,
//         transparent: true,
//         resolution: window.devicePixelRatio || 1,
//         // autoResize: true
//     }
// );

var saveDirectory = "./saves/";

three_renderer.domElement.id = "three";
//app.view.id = "pixi";
document.body.appendChild(three_renderer.domElement);
//document.body.appendChild(app.view);


//app.stage.addChild(view);

/*document?.addEventListener("pointerdown",(ev:MouseEvent)=>{
    three_renderer.domElement.requestPointerLock();
});*/

//const fpsMeter = new PIXI.Text("FPS:__");

//fpsMeter.y = 20;
//fpsMeter.x = 20;

//app.stage.addChild(fpsMeter);

// var oldTime = 0;
// var fps = 0;
// var fpsa = 0.01;
// var spf = 0;
// var spfa = .01;
// function physLoop(delta: number): void {
//     //time += delta;
//     //ctlr.physics(delta);
//     fps = fps * (1 - fpsa) + (60 / delta) * fpsa;
//     fpsMeter.text = "FPS:" + fps;
// }


//test terrain



const worker = new Worker("spiral_raster_geometry.js");
const api = wrap<MeshWorker>(worker);

const grund_geo = new THREE.BufferGeometry();
let grund:THREE.Mesh;
api.spiral_raster_geometry(state.terrain,{x:0,y:0,z:0}).then((v)=>{
    const material = new THREE.MeshStandardMaterial({ vertexColors: true });
    const b = grund_geo;
    for (let k of Object.keys( v[0] )){
        const attribute = new THREE.BufferAttribute(
	    v[0][k],
	    v[1][k],
	    false
	);
        b.setAttribute(k,attribute);
    }
    grund = new THREE.Mesh(b, material);
    three_scene.add(grund);
}); 





//ecs stuff
const world = new World();
(window as any).world = world;
world.addPlugin(TimePlugin);
world.addPlugin(InputPlugin);


const SceneResource = new Resource<THREE.Scene>({ name: "scene", });

world.resources.set(SceneResource, three_scene);

const Obj3dComponent = new Component<THREE.Object3D>({ name: "object" });
world.resources.set(SceneResource, three_scene);

const CubeProvider = Provide({
    args: [SceneResource],
    factory: (s) => {
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        var cube = new THREE.Mesh(geometry, material);
        s.add(cube);
        return cube;
    },
    provided: Obj3dComponent,
});

const CubeSpinny = new System({
    name: "speen",
    args: [TimeResource, CubeProvider, keyboardState] as const,
    step: (t, c, k) => {
        c.applyQuaternion(new THREE.Quaternion(.003, .001 + (k.has('w') ? .3 : 0), .002, .999).normalize());
    }
});
//world.addSystem(CubeSpinny);

const CubeESpinny = new System({
    name: "speeen",
    events: [wheel],
    args: [TimeResource, CubeProvider, wheel, Emit] as const,
    step: (t, c, w, e) => {
        c.applyQuaternion(new THREE.Quaternion(-.03, .06, .02, .99).normalize());
    }
});
//world.addSystem(CubeESpinny);




/*const terrainRegen = new AsyncSystem({
    name: "terrain render",
    args: [Obj3dComponent] as const,
    async step(o){
        const v = await api.spiral_raster_geometry({x:o.position.x,y:o.position.y,z:o.position.z});
        const material = new THREE.MeshStandardMaterial({ vertexColors: true });
        const b = grund_geo;
        for (let k of Object.keys( v[0] )){
            const attribute = new THREE.BufferAttribute(
	        v[0][k],
	        v[1][k],
	        false
	    );
            b.setAttribute(k,attribute);
        }
        grund.position.x = o.position.x;
        grund.position.y = o.position.y;
    },
    exclusive:true,
});
world.addSystem(terrainRegen);
*/

//hack
let terrain_regen = true;
function regen_terrain(pos:THREE.Vector3){
    const o = {x:pos.x,y:pos.y,z:pos.z};
    if (terrain_regen) {
        terrain_regen = false;
        api.spiral_raster_geometry(state.terrain,{x:o.x,y:o.y,z:o.z}).then((v)=>{
            //const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const b = grund_geo;
            for (let k of Object.keys( v[0] )){
                const attribute = new THREE.BufferAttribute(
	            v[0][k],
	            v[1][k],
	            false
	        );
                b.setAttribute(k,attribute);
            }
            grund.position.x = o.x;
            grund.position.y = o.y;
            terrain_regen = true;
        });
    }
}










const freecamMovementComponent = new Component<{
    velocity: THREE.Vector3,
    movespeed: number,
    drag: number,
    enabled: boolean,
}>({ name: "fmc", })
const freecamMovement = new System({
    name: "freecam movement",
    args: [TimeResource, Obj3dComponent, freecamMovementComponent, keyboardState] as const,
    step: (t, o, pmc, k) => {
        //o.rotation.setFromQuaternion(pmc.orientation);

        if (k.has("p")) {
            pmc.enabled = true;
        } if (k.has('o')) {
            pmc.enabled = false;
        }
        if (!pmc.enabled)
            return;
        o.position.addScaledVector(pmc.velocity, t.delta_s);
        pmc.velocity.multiplyScalar(Math.exp(-t.delta_s * pmc.drag));
        let x = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
        let y = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
        let z = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        //pmc.frame.extractBasis(x, y, z);
        const speed = pmc.movespeed * (k.has("Control") ? 10 : 1);
        if (k.has('w')) {
            pmc.velocity.addScaledVector(z, -t.delta_s * speed);
        } if (k.has('s')) {
            pmc.velocity.addScaledVector(z, t.delta_s * speed);
        } if (k.has('a')) {
            pmc.velocity.addScaledVector(x, -t.delta_s * speed);
        } if (k.has('d')) {
            pmc.velocity.addScaledVector(x, t.delta_s * speed);
        } if (k.has('Shift')) {
            pmc.velocity.addScaledVector(y, -t.delta_s * speed);
        } if (k.has(' ')) {
            pmc.velocity.addScaledVector(y, t.delta_s * speed);
        } if (k.has('Escape')) {
            document.exitPointerLock();
        } if (k.has('`')) {
            const canvas = document.getElementById('three')
            if (canvas)
                canvas.requestPointerLock();
        }
        const v = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        if (k.has('q')) {
            o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, 100).normalize());
        } if (k.has('e')) {
            o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, -100).normalize());
        }

    }
});
world.addSystem(freecamMovement);


const carMovementComponent = new Component<{
    velocity: THREE.Vector3,
    movespeed: number,
    drag: number,
    angularVelocity: THREE.Vector3,
    enabled: boolean,
}>({ name: "cmc", })
const carMovement = new System({
    name: "freecar movement",
    args: [TimeResource, Obj3dComponent, carMovementComponent, keyboardState] as const,
    step: (t, o, pmc, k) => {
        const ter = terrains.get(state.terrain)??((x,y)=>0);
        regen_terrain(o.position);
        if (k.has("o")) {
            pmc.enabled = true;
        } if (k.has('p')) {
            pmc.enabled = false;
        }
        if (!pmc.enabled)
            return;

        //o.rotation.setFromQuaternion(pmc.orientation);
        o.position.addScaledVector(pmc.velocity, t.delta_s);
        o.applyQuaternion(new THREE.Quaternion(pmc.angularVelocity.x * t.delta_s, pmc.angularVelocity.y * t.delta_s, pmc.angularVelocity.z * t.delta_s, 1).normalize());
        let x = new THREE.Vector3(1, 0, 0).applyQuaternion(o.quaternion);
        let y = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
        let z = new THREE.Vector3(0, 0, 1).applyQuaternion(o.quaternion);
        //pmc.frame.extractBasis(x, y, z);
        const vforward = pmc.velocity.dot(z);
        const speed = pmc.movespeed * (k.has("Control") ? 10 : 1);
        if (k.has('e')) {
            pmc.velocity.addScaledVector(z, -t.delta_s * speed);
        } if (k.has('d')) {
            pmc.velocity.addScaledVector(z, t.delta_s * speed);
        } if (k.has('s')) {
            pmc.angularVelocity.addScaledVector(y, t.delta_s * (1.8 - vforward / 65));
        } if (k.has('f')) {
            pmc.angularVelocity.addScaledVector(y, -t.delta_s * (1.8 - vforward / 65));
        } if (k.has('a')) {
            pmc.angularVelocity.addScaledVector(y, t.delta_s * (0.3 - vforward / 10));
        } if (k.has('g')) {
            pmc.angularVelocity.addScaledVector(y, -t.delta_s * (0.3 - vforward / 10));
        } if (k.has('Shift')) {
            pmc.velocity.addScaledVector(y, -t.delta_s * speed);
        } if (k.has(' ')) {
            pmc.velocity.addScaledVector(y, t.delta_s * speed);
        } if (k.has('Escape')) {
            document.exitPointerLock();
        } if (k.has('`')) {
            const canvas = document.getElementById('three')
            if (canvas)
                canvas.requestPointerLock();
        }

        if (k.has('w')) {
            o.applyQuaternion(new THREE.Quaternion(z.x, z.y, z.z, 100).normalize());
        } if (k.has('r')) {
            o.applyQuaternion(new THREE.Quaternion(z.x, z.y, z.z, -100).normalize());
        }
        pmc.velocity.z -= t.delta_s * 45;
        const tz = ter(o.position.x, o.position.y);
        const eps = 0.001;
        const tzx = ter(o.position.x + eps, o.position.y);
        const tzy = ter(o.position.x, o.position.y + eps);
        if (o.position.z <= tz + 1) {
            const vnforward = pmc.velocity.dot(z);
            const vsideways = pmc.velocity.dot(x);
            const norm = new THREE.Vector3(tz - tzx, tz - tzy, eps).normalize();
            pmc.velocity.addScaledVector(norm, -pmc.velocity.dot(norm));
            pmc.velocity.addScaledVector(x, Math.min(t.delta_s * 1000, Math.max(-t.delta_s * 1000, -vsideways)));
            o.position.z = tz + 1;
            const drag = k.has('b') ? speed * 10 : pmc.drag;
            pmc.velocity.addScaledVector(z, Math.min(drag * t.delta_s, Math.max(-drag * t.delta_s, -vnforward)));

            pmc.angularVelocity.multiplyScalar(Math.exp(-t.delta_s * 10));
            pmc.angularVelocity.addScaledVector(norm.cross(y), -1);
        }
    }
});
world.addSystem(carMovement);



const playerRotate = new System({
    name: "player rotate",
    events: [mousemove],
    args: [Obj3dComponent, freecamMovementComponent, mousemove] as const,
    step: (o, pmc, m) => {
        const v = new THREE.Vector3(-m.movementY, -m.movementX, 0).applyQuaternion(o.quaternion);
        o.applyQuaternion(new THREE.Quaternion(v.x, v.y, v.z, 500).normalize());
    }
});
world.addSystem(playerRotate);


let three_camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 10000);
three_camera.position.z = 5;
Obj3dComponent
function makePlayer(): Entity {
    three_camera.rotateX(Math.PI / 2);
    return new Entity()
        .addComponent(Obj3dComponent, three_camera)
        .addComponent(carMovementComponent, {
            velocity: new THREE.Vector3(0, 0, -0),
            angularVelocity: new THREE.Vector3(0, 0, -0),
            movespeed: 10,
            drag: 0.1,
            enabled: true,
        })
        .addComponent(freecamMovementComponent, {
            enabled: false,
            drag: 10,
            movespeed: 100,
            velocity: new THREE.Vector3(0, 0, 0),
        })
}
world.entities.set("player", makePlayer());



window.onresize = function(_event: UIEvent): void {
    //    app.renderer.resize(window.innerWidth, window.innerHeight);
    three_renderer.setSize(window.innerWidth, window.innerHeight);
    three_camera.aspect = window.innerWidth / window.innerHeight;
    three_camera.fov = (three_camera.aspect > 1) ? fov / three_camera.aspect : fov;
    three_camera.updateProjectionMatrix();
};

//app.ticker.add(physLoop);


function animate(time: number) {
    requestAnimationFrame(animate);
    world.step();
    //spf = spf * (1 - spfa) + spfa * (time - oldTime) / 1000;
    //fpsMeter.text = "time:" + (time / 1000).toFixed(6) + "\nfps:" + (1000 / (time - oldTime)).toFixed(2) + "\navgFps:" + (1 / spf).toFixed(2);

    //if (three_camera.userData.eye_sep == 0 && three_camera.userData.eye_overlap == 0) {
    three_renderer.render(three_scene, three_camera);
    /* } else {
         perspRender();
     }*/
    //oldTime = time;

}
animate(0);
