//AA
import { EcsEvent } from "nova_ecs/events";
import { Plugin } from "nova_ecs/plugin";
import { Resource } from "nova_ecs/resource";
import { System } from "nova_ecs/system";


export const keydown = new EcsEvent<KeyboardEvent>();
export const keyup = new EcsEvent<KeyboardEvent>();
export const mousemove = new EcsEvent<MouseEvent>();
export const mousedown = new EcsEvent<MouseEvent>();
export const mouseup = new EcsEvent<MouseEvent>();
export const wheel = new EcsEvent<WheelEvent>();
export const keyboardState = new Resource<Set<string>>("keyboard state");
export const InputPlugin: Plugin = {
    name: "inputs",
    build: (world) => {

        document.addEventListener("keydown", ((event: KeyboardEvent) => {
            world.emit(keydown, event);
        }));

        document.addEventListener("keyup", ((event: KeyboardEvent) => {
            world.emit(keyup, event);
        }));

        document.addEventListener("mousemove", ((event: MouseEvent) => {
            world.emit(mousemove, event);
        }));

        document.addEventListener("mousedown", ((event: MouseEvent) => {
            world.emit(mousedown, event);
        }));

        document.addEventListener("mouseup", ((event: MouseEvent) => {
            world.emit(mouseup, event);
        }));

        document.addEventListener("wheel", ((event: WheelEvent) => {
            world.emit(wheel, event);
        }));
        world.resources.set(keyboardState, new Set<string>());
        const keydownSyst = new System({
            name: "keydownSystem",
            events: [keydown] as const,
            args: [keyboardState, keydown] as const,
            step: (kb, ke) => {
                kb.add(ke.key);
                //console.log(ke);
            }
        });
        world.addSystem(keydownSyst);
        const keyupSyst = new System({
            name: "keyupSystem",
            events: [keyup] as const,
            args: [keyboardState, keyup] as const,
            step: (kb, ke) => {
                kb.delete(ke.key);
            }
        });
        world.addSystem(keyupSyst);
        /*
                const mouse = new Resource<Set<string>>({ name: "", });
                world.resources.set(keyboard, new Set<string>());
                const keydownSyst = new System({
                    name: "keydownSystem",
                    events: [keydown] as const,
                    args: [keyboard, keydown] as const,
                    step: (kb, ke) => {
                        kb.add(ke.key);
                    }
                });
                world.addSystem(keydownSyst);
                const keyupSyst = new System({
                    name: "keyupSystem",
                    events: [keyup] as const,
                    args: [keyboard, keyup] as const,
                    step: (kb, ke) => {
                        kb.delete(ke.key);
                    }
                });
                world.addSystem(keyupSyst);
        */
    }

}
