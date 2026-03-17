const createdSettings: Setting[] = [];

export function getCreatedSettings(): Setting[] {
  return createdSettings;
}

export function resetCreatedSettings(): void {
  createdSettings.length = 0;
}

export class App {}

export class Notice {
  constructor(
    public message: string,
    public timeout?: number,
  ) {}
}

export class Plugin {
  app: unknown;

  constructor(app?: unknown) {
    this.app = app;
  }
}

export class TFile {
  path = "";
  basename = "";
  extension = "";

  constructor(init?: Partial<TFile>) {
    Object.assign(this, init);
  }
}

export class MockContainerEl {
  classes = new Set<string>();

  empty(): void {
    resetCreatedSettings();
  }

  addClass(name: string): void {
    this.classes.add(name);
  }
}

export class DropdownComponent {
  options = new Map<string, string>();
  value = "";
  onChangeHandler?: (value: string) => Promise<void> | void;

  addOption(value: string, label: string): this {
    this.options.set(value, label);
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  onChange(handler: (value: string) => Promise<void> | void): this {
    this.onChangeHandler = handler;
    return this;
  }

  async trigger(value: string): Promise<void> {
    this.value = value;
    await this.onChangeHandler?.(value);
  }
}

export class TextComponent {
  placeholder = "";
  value = "";
  disabled = false;
  onChangeHandler?: (value: string) => Promise<void> | void;

  setPlaceholder(value: string): this {
    this.placeholder = value;
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  setDisabled(value: boolean): this {
    this.disabled = value;
    return this;
  }

  onChange(handler: (value: string) => Promise<void> | void): this {
    this.onChangeHandler = handler;
    return this;
  }
}

export class ToggleComponent {
  value = false;
  onChangeHandler?: (value: boolean) => Promise<void> | void;

  setValue(value: boolean): this {
    this.value = value;
    return this;
  }

  onChange(handler: (value: boolean) => Promise<void> | void): this {
    this.onChangeHandler = handler;
    return this;
  }
}

export class PluginSettingTab {
  app: unknown;
  plugin: unknown;
  containerEl = new MockContainerEl();

  constructor(app: unknown, plugin: unknown) {
    this.app = app;
    this.plugin = plugin;
  }
}

export class Setting {
  name = "";
  desc = "";
  heading = false;
  dropdown?: DropdownComponent;
  text?: TextComponent;
  toggle?: ToggleComponent;

  constructor(_containerEl: MockContainerEl) {
    createdSettings.push(this);
  }

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setDesc(value: string): this {
    this.desc = value;
    return this;
  }

  setHeading(): this {
    this.heading = true;
    return this;
  }

  addDropdown(callback: (dropdown: DropdownComponent) => DropdownComponent): this {
    this.dropdown = callback(new DropdownComponent());
    return this;
  }

  addText(callback: (text: TextComponent) => TextComponent): this {
    this.text = callback(new TextComponent());
    return this;
  }

  addToggle(callback: (toggle: ToggleComponent) => ToggleComponent): this {
    this.toggle = callback(new ToggleComponent());
    return this;
  }
}
