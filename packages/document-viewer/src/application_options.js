import { AppOptions } from "../pdf.js/web/app_options.js";

class ApplicationOptions {
  static defaultOptions = Object.create(null);

  constructor() {
    this.userOptions = Object.create(null);
  }

  static initialize() {
    ApplicationOptions.defaultOptions = AppOptions.getAll();
  }

  get(name) {
    const userOption = this.userOptions[name];
    if (userOption !== undefined) {
      return userOption;
    }
    const defaultOption = ApplicationOptions.defaultOptions[name];
    if (defaultOption !== undefined) {
      return defaultOption.value;
    }
    return undefined;
  }

  // getAll(kind = null) {
  //   const options = Object.create(null);
  //   for (const name in defaultOptions) {
  //     const defaultOption = defaultOptions[name];
  //     if (kind) {
  //       if ((kind & defaultOption.kind) === 0) {
  //         continue;
  //       }
  //       if (kind === OptionKind.PREFERENCE) {
  //         const value = defaultOption.value,
  //           valueType = typeof value;
  //
  //         if (
  //           valueType === "boolean" ||
  //           valueType === "string" ||
  //           (valueType === "number" && Number.isInteger(value))
  //         ) {
  //           options[name] = value;
  //           continue;
  //         }
  //         throw new Error(`Invalid type for preference: ${name}`);
  //       }
  //     }
  //     const userOption = userOptions[name];
  //     options[name] =
  //       userOption !== undefined
  //         ? userOption
  //         : compatibilityParams[name] ?? defaultOption.value;
  //   }
  //   return options;
  // }

  set(name, value) {
    this.userOptions[name] = value;
  }

  setAll(options) {
    for (const name in options) {
      this.userOptions[name] = options[name];
    }
  }

  remove(name) {
    delete this.userOptions[name];
  }
}

ApplicationOptions.initialize();

export { ApplicationOptions };
