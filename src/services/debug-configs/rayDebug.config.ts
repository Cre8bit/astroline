import type { DebugRayConfig, GroupToggleConfig, RayDebuggerService } from "../rayDebugger.service";

export interface RayDebugConfigFile {
  groups: {
    [groupName: string]: {
      toggle: GroupToggleConfig;
      config: DebugRayConfig;
    };
  };
}

export const rayDebugConfig: RayDebugConfigFile = {
  groups: {
    gravity: {
      toggle: {
        key: "g",
        groupName: "gravity",
        description: "Gravity debug visualization",
        defaultEnabled: true,
      },
      config: {
        color: 0xff0000,
        scaleFactor: 2,
        maxLength: 50,
        headLength: undefined,
        headWidth: undefined,
        opacity: 0.8,
      },
    },
    direction: {
      toggle: {
        key: "f",
        groupName: "direction",
        description: "Entity direction debug visualization",
        defaultEnabled: true,
      },
      config: {
        color: 0x00ff00,
        scaleFactor: 5,
        maxLength: 30,
        headLength: undefined,
        headWidth: undefined,
        opacity: 0.9,
      },
    },
  },
};

export function setupRayDebugger(rayDebuggerService: RayDebuggerService) {
  Object.values(rayDebugConfig.groups).forEach(({ toggle, config }) => {
    rayDebuggerService.registerGroupToggle(toggle);
    rayDebuggerService.setGroupConfig(toggle.groupName, config);
  });
}
