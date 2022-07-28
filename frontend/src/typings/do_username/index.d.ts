declare module 'do_username' {
  export var SEA_CREATURES: readonly string[];
  export var SEA_OBJECTS: readonly string[];
  export var ADJECTIVE_DESCRIPTORS: readonly string[];
  export var SIZE_DESCRIPTORS: readonly string[];
  export var CREATURE_DESCRIPTORS: readonly string[];
  export var SEA_LIST: readonly string[];
  export var DESCRIPTORS: readonly string[];
  export var COLORS: readonly string[];
  export function generate(maxSize?: number): any;
}