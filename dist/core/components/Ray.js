import GraphicalComponent from './abstract/GraphicalComponent.js';
import me from '../../_snowpack/pkg/math-expressions.js';
import { convertValueToMathExpression } from '../utils/math.js';

export default class Ray extends GraphicalComponent {
  static componentType = "ray";

  actions = {
    moveRay: this.moveRay.bind(this),
    rayClicked: this.rayClicked.bind(this),
  };

  static createAttributesObject() {
    let attributes = super.createAttributesObject();

    attributes.draggable = {
      createComponentOfType: "boolean",
      createStateVariable: "draggable",
      defaultValue: true,
      public: true,
      forRenderer: true
    };

    attributes.endpoint = {
      createComponentOfType: "point"
    }
    attributes.through = {
      createComponentOfType: "point"
    }
    attributes.direction = {
      createComponentOfType: "vector",
    };

    return attributes;
  }


  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.styleDescription = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "text",
      },
      returnDependencies: () => ({
        selectedStyle: {
          dependencyType: "stateVariable",
          variableName: "selectedStyle",
        },
      }),
      definition: function ({ dependencyValues }) {

        let styleDescription = dependencyValues.selectedStyle.lineWidthWord;
        if (dependencyValues.selectedStyle.lineStyleWord) {
          if (styleDescription) {
            styleDescription += " ";
          }
          styleDescription += dependencyValues.selectedStyle.lineStyleWord;
        }

        if (styleDescription) {
          styleDescription += " ";
        }

        styleDescription += dependencyValues.selectedStyle.lineColorWord

        return { setValue: { styleDescription } };
      }
    }

    stateVariableDefinitions.styleDescriptionWithNoun = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "text",
      },
      returnDependencies: () => ({
        styleDescription: {
          dependencyType: "stateVariable",
          variableName: "styleDescription",
        },
      }),
      definition: function ({ dependencyValues }) {

        let styleDescriptionWithNoun = dependencyValues.styleDescription + " ray";

        return { setValue: { styleDescriptionWithNoun } };
      }
    }

    // directionShadow will be null unless vector was created
    // from serialized state with direction value
    stateVariableDefinitions.directionShadow = {
      defaultValue: null,
      hasEssential: true,
      essentialVarName: "direction",
      set: convertValueToMathExpression,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          directionShadow: true
        }
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [{
            setEssentialValue: "directionShadow",
            value: convertValueToMathExpression(desiredStateVariableValues.directionShadow)
          }]
        };
      }
    }


    // throughShadow will be null unless vector was created
    // from serialized state with through value
    stateVariableDefinitions.throughShadow = {
      defaultValue: null,
      hasEssential: true,
      essentialVarName: "through",
      set: convertValueToMathExpression,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          throughShadow: true
        }
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [{
            setEssentialValue: "throughShadow",
            value: convertValueToMathExpression(desiredStateVariableValues.throughShadow)
          }]
        };
      }
    }

    // endpointShadow will be null unless vector was created
    // from serialized state with endpoint value
    stateVariableDefinitions.endpointShadow = {
      defaultValue: null,
      hasEssential: true,
      essentialVarName: "endpoint",
      set: convertValueToMathExpression,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          endpointShadow: true
        }
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [{
            setEssentialValue: "endpointShadow",
            value: convertValueToMathExpression(desiredStateVariableValues.endpointShadow)
          }]
        };
      }
    }


    stateVariableDefinitions.basedOnThrough = {
      returnDependencies: () => ({
        throughAttr: {
          dependencyType: "attributeComponent",
          attributeName: "through"
        },
        throughShadow: {
          dependencyType: "stateVariable",
          variableName: "throughShadow"
        },
        endpointAttr: {
          dependencyType: "attributeComponent",
          attributeName: "endpoint"
        },
        directionAttr: {
          dependencyType: "attributeComponent",
          attributeName: "direction"
        },
      }),
      definition: function ({ dependencyValues }) {

        if (dependencyValues.endpointAttr !== null &&
          dependencyValues.directionAttr !== null
        ) {
          if (dependencyValues.throughAttr !== null) {
            // if overprescribed by specifying through, endpoint, and direction
            // we ignore through
            console.warn(`Ray is prescribed by through, endpoint, and direction.  Ignoring specified through.`);
          }
          return {
            setValue: { basedOnThrough: false },
            checkForActualChange: { basedOnThrough: true }
          }
        }

        if (dependencyValues.throughAttr !== null) {
          return {
            setValue: { basedOnThrough: true },
            checkForActualChange: { basedOnThrough: true }
          }
        }

        return {
          setValue: { basedOnThrough: dependencyValues.throughShadow !== null },
          checkForActualChange: { basedOnThrough: true }
        }

      }
    }

    stateVariableDefinitions.basedOnEndpoint = {
      returnDependencies: () => ({
        endpointAttr: {
          dependencyType: "attributeComponent",
          attributeName: "endpoint"
        },
        endpointShadow: {
          dependencyType: "stateVariable",
          variableName: "endpointShadow"
        },
      }),
      definition: function ({ dependencyValues }) {

        if (dependencyValues.endpointAttr !== null) {
          return {
            setValue: { basedOnEndpoint: true },
            checkForActualChange: { basedOnEndpoint: true }
          }
        }

        return {
          setValue: { basedOnEndpoint: dependencyValues.endpointShadow !== null },
          checkForActualChange: { basedOnEndpoint: true }
        }

      }
    }

    stateVariableDefinitions.basedOnDirection = {
      returnDependencies: () => ({
        directionAttr: {
          dependencyType: "attributeComponent",
          attributeName: "direction"
        },
        directionShadow: {
          dependencyType: "stateVariable",
          variableName: "directionShadow"
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.directionAttr !== null) {
          return {
            setValue: { basedOnDirection: true },
            checkForActualChange: { basedOnDirection: true }
          }
        }
        return {
          setValue: { basedOnDirection: dependencyValues.directionShadow !== null },
          checkForActualChange: { basedOnDirection: true }
        }

      }
    }


    stateVariableDefinitions.nDimDirection = {
      stateVariablesDeterminingDependencies: ['basedOnDirection', 'basedOnThrough', 'basedOnEndpoint'],
      returnDependencies({ stateValues }) {

        let dependencies = {
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          basedOnEndpoint: {
            dependencyType: "stateVariable",
            variableName: "basedOnEndpoint",
          },
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          directionShadow: {
            dependencyType: "stateVariable",
            variableName: "directionShadow",
          },
          directionAttr: {
            dependencyType: "attributeComponent",
            attributeName: "direction",
            variableNames: ["nDimensions"],
          },
        }

        if (!stateValues.basedOnDirection) {
          if (stateValues.basedOnThrough) {
            dependencies.nDimThrough = {
              dependencyType: "stateVariable",
              variableName: "nDimThrough"
            }
          }
          if (stateValues.basedOnEndpoint) {
            dependencies.nDimEndpoint = {
              dependencyType: "stateVariable",
              variableName: "nDimEndpoint"
            }
          }
        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {

        let nDimDirection;

        if (dependencyValues.basedOnDirection) {
          if (dependencyValues.directionAttr !== null) {
            nDimDirection = dependencyValues.directionAttr.stateValues.nDimensions;
          } else if (dependencyValues.directionShadow) {
            let directionTree = dependencyValues.directionShadow.tree;
            if (Array.isArray(directionTree) && ["tuple", "vector"].includes(directionTree[0])) {
              nDimDirection = directionTree.length - 1;
            } else {
              nDimDirection = 2;
            }
          }
        } else {
          if (dependencyValues.basedOnThrough) {
            if (dependencyValues.basedOnEndpoint) {
              if (dependencyValues.nDimThrough === dependencyValues.nDimEndpoint) {
                nDimDirection = dependencyValues.nDimThrough;
              } else {
                nDimDirection = NaN;
              }
            } else {
              nDimDirection = dependencyValues.nDimThrough;
            }
          } else if (dependencyValues.basedOnEndpoint) {
            nDimDirection = dependencyValues.nDimEndpoint;
          } else {
            nDimDirection = 2;
          }

        }

        return { setValue: { nDimDirection }, checkForActualChange: { nDimDirection: true } };

      }
    }

    stateVariableDefinitions.nDimThrough = {
      stateVariablesDeterminingDependencies: ['basedOnDirection', 'basedOnThrough', 'basedOnEndpoint'],
      returnDependencies({ stateValues }) {

        let dependencies = {
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          basedOnEndpoint: {
            dependencyType: "stateVariable",
            variableName: "basedOnEndpoint",
          },
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          throughShadow: {
            dependencyType: "stateVariable",
            variableName: "throughShadow",
          },
          throughAttr: {
            dependencyType: "attributeComponent",
            attributeName: "through",
            variableNames: ["nDimensions"],
          },
        }

        if (!stateValues.basedOnThrough) {
          if (stateValues.basedOnEndpoint) {
            dependencies.nDimEndpoint = {
              dependencyType: "stateVariable",
              variableName: "nDimEndpoint"
            }
          }
          if (stateValues.basedOnDirection) {
            dependencies.nDimDirection = {
              dependencyType: "stateVariable",
              variableName: "nDimDirection"
            }
          }

        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {

        let nDimThrough;

        if (dependencyValues.basedOnThrough) {
          if (dependencyValues.throughAttr !== null) {
            nDimThrough = dependencyValues.throughAttr.stateValues.nDimensions;
          } else if (dependencyValues.throughShadow) {
            let throughTree = dependencyValues.throughShadow.tree;
            if (Array.isArray(throughTree) && ["tuple", "vector"].includes(throughTree[0])) {
              nDimThrough = throughTree.length - 1;
            } else {
              nDimThrough = 2;
            }
          }
        } else {

          if (dependencyValues.basedOnDirection) {
            if (dependencyValues.basedOnEndpoint) {
              if (dependencyValues.nDimDirection === dependencyValues.nDimEndpoint) {
                nDimThrough = dependencyValues.nDimDirection;
              } else {
                nDimThrough = NaN;
              }
            } else {
              nDimThrough = dependencyValues.nDimDirection;
            }
          } else if (dependencyValues.basedOnEndpoint) {
            nDimThrough = dependencyValues.nDimEndpoint;
          } else {
            nDimThrough = 2;
          }
        }

        return { setValue: { nDimThrough }, checkForActualChange: { nDimThrough: true } };

      }
    }

    stateVariableDefinitions.nDimEndpoint = {
      stateVariablesDeterminingDependencies: ['basedOnDirection', 'basedOnThrough', 'basedOnEndpoint'],
      returnDependencies({ stateValues }) {

        let dependencies = {
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          basedOnEndpoint: {
            dependencyType: "stateVariable",
            variableName: "basedOnEndpoint",
          },
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          endpointShadow: {
            dependencyType: "stateVariable",
            variableName: "endpointShadow",
          },
          endpointAttr: {
            dependencyType: "attributeComponent",
            attributeName: "endpoint",
            variableNames: ["nDimensions"],
          },
        }

        if (!stateValues.basedOnEndpoint) {
          if (stateValues.basedOnThrough) {
            dependencies.nDimThrough = {
              dependencyType: "stateVariable",
              variableName: "nDimThrough"
            }
          }
          if (stateValues.basedOnDirection) {
            dependencies.nDimDirection = {
              dependencyType: "stateVariable",
              variableName: "nDimDirection"
            }
          }

        }
        return dependencies;
      },
      definition: function ({ dependencyValues }) {

        let nDimEndpoint;

        if (dependencyValues.basedOnEndpoint) {
          if (dependencyValues.endpointAttr !== null) {
            nDimEndpoint = dependencyValues.endpointAttr.stateValues.nDimensions;
          } else if (dependencyValues.endpointShadow) {
            let endpointTree = dependencyValues.endpointShadow.tree;
            if (Array.isArray(endpointTree) && ["tuple", "vector"].includes(endpointTree[0])) {
              nDimEndpoint = endpointTree.length - 1;
            } else {
              nDimEndpoint = 2;
            }
          }
        } else {

          if (dependencyValues.basedOnDirection) {
            if (dependencyValues.basedOnThrough) {
              if (dependencyValues.nDimDirection === dependencyValues.nDimThrough) {
                nDimEndpoint = dependencyValues.nDimDirection;
              } else {
                nDimEndpoint = NaN;
              }
            } else {
              nDimEndpoint = dependencyValues.nDimDirection;
            }
          } else if (dependencyValues.basedOnThrough) {
            nDimEndpoint = dependencyValues.nDimThrough;
          } else {
            nDimEndpoint = 2;
          }
        }

        return { setValue: { nDimEndpoint }, checkForActualChange: { nDimEndpoint: true } };

      }
    }

    stateVariableDefinitions.nDimensions = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "number",
      },
      returnDependencies: () => ({
        basedOnThrough: {
          dependencyType: "stateVariable",
          variableName: "basedOnThrough",
        },
        basedOnEndpoint: {
          dependencyType: "stateVariable",
          variableName: "basedOnEndpoint",
        },
        basedOnDirection: {
          dependencyType: "stateVariable",
          variableName: "basedOnDirection",
        },
        nDimDirection: {
          dependencyType: "stateVariable",
          variableName: "nDimDirection"
        },
        nDimThrough: {
          dependencyType: "stateVariable",
          variableName: "nDimThrough",
        },
        nDimEndpoint: {
          dependencyType: "stateVariable",
          variableName: "nDimEndpoint",
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`nDimensions definition`)
        // console.log(dependencyValues)

        let nDimensions
        if (dependencyValues.basedOnDirection) {
          if (dependencyValues.basedOnEndpoint) {
            // ignore through if have both direction and endpoint
            if (dependencyValues.nDimDirection !== dependencyValues.nDimEndpoint) {
              console.warn(`nDimensions mismatch in vector`)
              return { setValue: { nDimensions: NaN } }
            }
          } else if (dependencyValues.basedOnThrough) {
            if (dependencyValues.nDimDirection !== dependencyValues.nDimThrough) {
              console.warn(`nDimensions mismatch in vector`)
              return { setValue: { nDimensions: NaN } }
            }
          }
          nDimensions = dependencyValues.nDimDirection;
        } else if (dependencyValues.basedOnEndpoint) {
          if (dependencyValues.basedOnThrough) {
            if (dependencyValues.nDimEndpoint !== dependencyValues.nDimThrough) {
              console.warn(`nDimensions mismatch in vector`)
              return { setValue: { nDimensions: NaN } }
            }
          }
          nDimensions = dependencyValues.nDimEndpoint;
        } else if (dependencyValues.basedOnThrough) {
          nDimensions = dependencyValues.nDimThrough;
        } else {
          nDimensions = 2;
        }

        return { setValue: { nDimensions }, checkForActualChange: { nDimensions: true } };

      }
    }



    // allowed possibilities for specified properties
    // nothing (endpoint set to zero, direction set to (1,0s), through set to endpoint+direction)
    // through (endpoint set to zero, direction set to through-endpoint)
    // endpoint (direction set to (1,0s), through set to endpoint+direction)
    // direction (endpoint set to zero, through set to endpoint+direction)
    // through and endpoint (direction set to through-endpoint)
    // through and direction (endpoint set to through-direction)
    // endpoint and direction (through set to endpoint+direction)
    // If through, endpoint, and displacment supplied, ignore through


    stateVariableDefinitions.direction = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "math",
        returnWrappingComponents(prefix) {
          if (prefix === "directionX") {
            return [];
          } else {
            // entire array
            // wrap by both <vector> and <xs>
            return [["vector", { componentType: "mathList", isAttribute: "xs" }]];
          }
        },
      },
      isArray: true,
      entryPrefixes: ["directionX"],
      hasEssential: true,
      essentialVarName: "direction2", // since "direction" used for directionShadow
      set: convertValueToMathExpression,
      stateVariablesDeterminingDependencies: ["basedOnDirection", "basedOnThrough"],
      returnArraySizeDependencies: () => ({
        nDimDirection: {
          dependencyType: "stateVariable",
          variableName: "nDimDirection",
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimDirection];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {

        let globalDependencies = {
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          basedOnEndpoint: {
            dependencyType: "stateVariable",
            variableName: "basedOnEndpoint",
          },
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          directionShadow: {
            dependencyType: "stateVariable",
            variableName: "directionShadow"
          },
        }

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            directionAttr: {
              dependencyType: "attributeComponent",
              attributeName: "direction",
              variableNames: ["x" + varEnding],
            },
          }

          if (!stateValues.basedOnDirection && stateValues.basedOnThrough) {
            // if not based on direction and based on through, 
            // will always use through and endpoint values
            // even if not based on endpoint,
            // as endpoint will be made essential (with default of zero)
            dependenciesByKey[arrayKey].endpointX = {
              dependencyType: "stateVariable",
              variableName: "endpointX" + varEnding
            }
            dependenciesByKey[arrayKey].throughX = {
              dependencyType: "stateVariable",
              variableName: "throughX" + varEnding
            }
          }
        }


        return { globalDependencies, dependenciesByKey }

      },
      arrayDefinitionByKey: function ({ globalDependencyValues, dependencyValuesByKey, arrayKeys }) {
        // console.log('array definition of vector direction', componentName)
        // console.log(globalDependencyValues, dependencyValuesByKey, arrayKeys)

        let direction = {};
        let essentialDirection = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (globalDependencyValues.basedOnDirection) {
            if (dependencyValuesByKey[arrayKey].directionAttr !== null) {
              direction[arrayKey] = dependencyValuesByKey[arrayKey].directionAttr.stateValues["x" + varEnding];
            } else if (globalDependencyValues.directionShadow !== null) {
              direction[arrayKey] = globalDependencyValues.directionShadow.get_component(Number(arrayKey));
            }
          } else if (globalDependencyValues.basedOnThrough) {
            // basedOnDirection is false and based on through
            // calculate direction from through and endpoint
            direction[arrayKey] = dependencyValuesByKey[arrayKey].throughX.subtract(dependencyValuesByKey[arrayKey].endpointX).simplify();
          } else {
            // not based on direction or through, use essential value
            essentialDirection[arrayKey] = {
              defaultValue: me.fromAst(arrayKey === "0" ? 1 : 0)
            };
          }

        }


        let result = {};

        if (Object.keys(direction).length > 0) {
          result.setValue = { direction }
        }
        if (Object.keys(essentialDirection).length > 0) {
          result.useEssentialOrDefaultValue = { direction: essentialDirection }
        }

        return result;
      },
      inverseArrayDefinitionByKey({ desiredStateVariableValues,
        globalDependencyValues, dependencyValuesByKey, dependencyNamesByKey, arraySize,
      }) {

        // console.log(`inverse array definition of direction`)
        // console.log(JSON.parse(JSON.stringify(desiredStateVariableValues)))
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)))
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))

        let instructions = [];

        let updateDirectionShadow = false;

        for (let arrayKey in desiredStateVariableValues.direction) {

          if (globalDependencyValues.basedOnDirection) {
            if (dependencyValuesByKey[arrayKey].directionAttr !== null) {
              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].directionAttr,
                desiredValue: desiredStateVariableValues.direction[arrayKey],
                variableIndex: 0,
              })
            } else {
              // since based on direction and no source of direction
              // we must have a direction shadow
              updateDirectionShadow = true;

            }
          } else if (globalDependencyValues.basedOnThrough) {

            // basedOnDirection is false and based on through
            // set through to be sum of endpoint and desired direction
            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].throughX,
              desiredValue: dependencyValuesByKey[arrayKey].endpointX.add(desiredStateVariableValues.direction[arrayKey]).simplify()
            });

          } else {
            // not based on direction or through
            // set essential value

            instructions.push({
              setEssentialValue: "direction",
              value: { [arrayKey]: convertValueToMathExpression(desiredStateVariableValues.direction[arrayKey]) }
            })

          }
        }

        if (updateDirectionShadow) {
          if (arraySize[0] > 1) {
            let desiredDirection = ["vector"];
            for (let arrayKey in desiredStateVariableValues.direction) {
              desiredDirection[Number(arrayKey) + 1] = desiredStateVariableValues.direction[arrayKey].tree;
            }
            desiredDirection.length = arraySize[0] + 1
            instructions.push({
              setDependency: "directionShadow",
              desiredValue: me.fromAst(desiredDirection),
            })
          } else if (arraySize[0] === 1 && "0" in desiredStateVariableValues.direction) {
            instructions.push({
              setDependency: "directionShadow",
              desiredValue: desiredStateVariableValues.direction[0]
            })
          }
        }

        return {
          success: true,
          instructions
        };

      }
    }



    stateVariableDefinitions.through = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "math",
        returnWrappingComponents(prefix) {
          if (prefix === "throughX") {
            return [];
          } else {
            // entire array
            // wrap by both <point> and <xs>
            return [["point", { componentType: "mathList", isAttribute: "xs" }]];
          }
        },
      },
      isArray: true,
      entryPrefixes: ["throughX"],
      set: convertValueToMathExpression,
      stateVariablesDeterminingDependencies: ["basedOnThrough"],
      returnArraySizeDependencies: () => ({
        nDimThrough: {
          dependencyType: "stateVariable",
          variableName: "nDimThrough",
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimThrough];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {

        let globalDependencies = {
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          basedOnEndpoint: {
            dependencyType: "stateVariable",
            variableName: "basedOnEndpoint",
          },
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          throughShadow: {
            dependencyType: "stateVariable",
            variableName: "throughShadow"
          },
        }

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;
          dependenciesByKey[arrayKey] = {
            throughAttr: {
              dependencyType: "attributeComponent",
              attributeName: "through",
              variableNames: ["x" + varEnding],
            }
          }

          if (!stateValues.basedOnThrough) {
            // if not based on through, will always use endpoint and direction value
            // as, even if not based on endpoint or displacment,
            // they will be made essential 
            dependenciesByKey[arrayKey].endpointX = {
              dependencyType: "stateVariable",
              variableName: "endpointX" + varEnding
            }
            dependenciesByKey[arrayKey].directionX = {
              dependencyType: "stateVariable",
              variableName: "directionX" + varEnding
            }
          }
        }

        return { globalDependencies, dependenciesByKey }

      },
      arrayDefinitionByKey: function ({ globalDependencyValues, dependencyValuesByKey, arrayKeys }) {

        // console.log('array definition of vector through')
        // console.log(globalDependencyValues, dependencyValuesByKey, arrayKeys)

        let through = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (globalDependencyValues.basedOnThrough) {
            if (dependencyValuesByKey[arrayKey].throughAttr !== null) {
              through[arrayKey] = dependencyValuesByKey[arrayKey].throughAttr.stateValues["x" + varEnding];
            } else if (globalDependencyValues.throughShadow !== null) {
              through[arrayKey] = globalDependencyValues.throughShadow.get_component(Number(arrayKey));
            }
          } else {

            // basedOnThrough is false

            // direction and endpoint: add to create through
            // it doesn't matter if based on endpoint or direction
            // as will use their essential values

            through[arrayKey] = dependencyValuesByKey[arrayKey].endpointX.add(dependencyValuesByKey[arrayKey].directionX).simplify();
          }
        }

        return { setValue: { through } }

      },

      inverseArrayDefinitionByKey({ desiredStateVariableValues,
        globalDependencyValues, dependencyValuesByKey, dependencyNamesByKey, arraySize
      }) {

        // console.log(`inverse array definition of through`, desiredStateVariableValues,
        //   globalDependencyValues, dependencyValuesByKey
        // )

        let instructions = [];

        let updateThroughShadow = false;

        for (let arrayKey in desiredStateVariableValues.through) {

          if (globalDependencyValues.basedOnThrough) {

            if (dependencyValuesByKey[arrayKey].throughAttr &&
              dependencyValuesByKey[arrayKey].throughAttr !== null
            ) {

              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].throughAttr,
                desiredValue: desiredStateVariableValues.through[arrayKey],
                variableIndex: 0,
              })
            } else if (globalDependencyValues.throughShadow !== null) {
              updateThroughShadow = true;
            }
          } else {

            // not based on through

            // based on direction and endpoint (or their essential values):
            // set direction to be desired through - endpoint

            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].directionX,
              desiredValue: desiredStateVariableValues.through[arrayKey].subtract(dependencyValuesByKey[arrayKey].endpointX).simplify()
            })
          }

        }

        if (updateThroughShadow) {
          if (arraySize[0] > 1) {
            let desiredThrough = ["vector"];
            for (let arrayKey in desiredStateVariableValues.through) {
              desiredThrough[Number(arrayKey) + 1] = desiredStateVariableValues.through[arrayKey].tree;
            }
            desiredThrough.length = arraySize[0] + 1
            instructions.push({
              setDependency: "throughShadow",
              desiredValue: me.fromAst(desiredThrough),
            })
          } else if (arraySize[0] === 1 && "0" in desiredStateVariableValues.through) {
            instructions.push({
              setDependency: "throughShadow",
              desiredValue: desiredStateVariableValues.through[0]
            })
          }

        }

        return {
          success: true,
          instructions
        };

      }
    }



    stateVariableDefinitions.endpoint = {
      public: true,
      shadowingInstructions: {
        createComponentOfType: "math",
        returnWrappingComponents(prefix) {
          if (prefix === "endpointX") {
            return [];
          } else {
            // entire array
            // wrap by both <point> and <xs>
            return [["point", { componentType: "mathList", isAttribute: "xs" }]];
          }
        },
      },
      isArray: true,
      entryPrefixes: ["endpointX"],
      hasEssential: true,
      defaultValueByArrayKey: () => me.fromAst(0),
      essentialVarName: "endpoint2",  // since endpointShadow uses "endpoint"
      set: convertValueToMathExpression,
      stateVariablesDeterminingDependencies: ["basedOnEndpoint", "basedOnThrough", "basedOnDirection"],
      returnArraySizeDependencies: () => ({
        nDimEndpoint: {
          dependencyType: "stateVariable",
          variableName: "nDimEndpoint",
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nDimEndpoint];
      },
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {

        let globalDependencies = {
          basedOnDirection: {
            dependencyType: "stateVariable",
            variableName: "basedOnDirection",
          },
          basedOnThrough: {
            dependencyType: "stateVariable",
            variableName: "basedOnThrough",
          },
          endpointShadow: {
            dependencyType: "stateVariable",
            variableName: "endpointShadow"
          },
        }

        let dependenciesByKey = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          dependenciesByKey[arrayKey] = {
            endpointAttr: {
              dependencyType: "attributeComponent",
              attributeName: "endpoint",
              variableNames: ["x" + varEnding],
            }
          }

          if (!stateValues.basedOnEndpoint) {
            if (stateValues.basedOnThrough && stateValues.basedOnDirection) {
              dependenciesByKey[arrayKey].throughX = {
                dependencyType: "stateVariable",
                variableName: "throughX" + varEnding
              }
              dependenciesByKey[arrayKey].directionX = {
                dependencyType: "stateVariable",
                variableName: "directionX" + varEnding
              }
            }
          }
        }

        return { globalDependencies, dependenciesByKey }

      },
      arrayDefinitionByKey: function ({ globalDependencyValues, dependencyValuesByKey, arrayKeys }) {

        // console.log('array definition of vector endpoint');
        // console.log(JSON.parse(JSON.stringify(globalDependencyValues)))
        // console.log(JSON.parse(JSON.stringify(dependencyValuesByKey)))
        // console.log(JSON.parse(JSON.stringify(arrayKeys)))

        let endpoint = {};
        let essentialEndpoint = {};

        for (let arrayKey of arrayKeys) {
          let varEnding = Number(arrayKey) + 1;

          if (dependencyValuesByKey[arrayKey].endpointAttr !== null) {
            endpoint[arrayKey] = dependencyValuesByKey[arrayKey].endpointAttr.stateValues["x" + varEnding];
          } else if (globalDependencyValues.endpointShadow !== null) {
            endpoint[arrayKey] = globalDependencyValues.endpointShadow.get_component(Number(arrayKey));
          } else {

            // if made it to here, basedOnEndpoint is false

            if (globalDependencyValues.basedOnThrough && globalDependencyValues.basedOnDirection) {
              // based on through and direction,
              // subtract direction from through to get endpoint
              endpoint[arrayKey] = dependencyValuesByKey[arrayKey].throughX.subtract(dependencyValuesByKey[arrayKey].directionX).simplify();

            } else {

              // endpoint defaults to zero
              // (but it will use the resulting essential value after that
              // so any changes will be saved)

              essentialEndpoint[arrayKey] = true;

            }

          }
        }

        let result = {};

        if (Object.keys(endpoint).length > 0) {
          result.setValue = { endpoint };
        }
        if (Object.keys(essentialEndpoint).length > 0) {
          result.useEssentialOrDefaultValue = { endpoint: essentialEndpoint }
        }

        return result;

      },

      inverseArrayDefinitionByKey({ desiredStateVariableValues,
        globalDependencyValues, dependencyValuesByKey, dependencyNamesByKey, arraySize,
      }) {

        // console.log(`inverse array definition of endpoint`, desiredStateVariableValues,
        //   globalDependencyValues, dependencyValuesByKey
        // )

        let instructions = [];

        let updateEndpointShadow = false;

        for (let arrayKey in desiredStateVariableValues.endpoint) {

          if (dependencyValuesByKey[arrayKey].endpointAttr &&
            dependencyValuesByKey[arrayKey].endpointAttr !== null
          ) {

            instructions.push({
              setDependency: dependencyNamesByKey[arrayKey].endpointAttr,
              desiredValue: desiredStateVariableValues.endpoint[arrayKey],
              variableIndex: 0,
            })
          } else if (globalDependencyValues.endpointShadow !== null) {
            updateEndpointShadow = true;
          } else {

            // not based on endpoint

            if (globalDependencyValues.basedOnThrough && globalDependencyValues.basedOnDirection) {

              // set direction to be difference between through and desired endpoint

              instructions.push({
                setDependency: dependencyNamesByKey[arrayKey].directionX,
                desiredValue: dependencyValuesByKey[arrayKey].throughX.subtract(desiredStateVariableValues.endpoint[arrayKey]).simplify()
              })
            } else {

              // if not based on both through and direction,
              // then endpoint should have become
              // an essential state variable
              // set the value of the variable directly

              instructions.push({
                setEssentialValue: "endpoint",
                value: { [arrayKey]: convertValueToMathExpression(desiredStateVariableValues.endpoint[arrayKey]) }
              })

            }
          }

        }

        if (updateEndpointShadow) {
          if (arraySize[0] > 1) {
            let desiredEndpoint = ["vector"];
            for (let arrayKey in desiredStateVariableValues.endpoint) {
              desiredEndpoint[Number(arrayKey) + 1] = desiredStateVariableValues.endpoint[arrayKey].tree;
            }
            desiredEndpoint.length = arraySize[0] + 1
            instructions.push({
              setDependency: "endpointShadow",
              desiredValue: me.fromAst(desiredEndpoint),
            })
          } else if (arraySize[0] === 1 && "0" in desiredStateVariableValues.endpoint) {
            instructions.push({
              setDependency: "endpointShadow",
              desiredValue: desiredStateVariableValues.endpoint[0]
            })
          }

        }

        return {
          success: true,
          instructions
        };

      }
    }


    stateVariableDefinitions.numericalEndpoint = {
      forRenderer: true,
      returnDependencies() {
        return {
          nDimensions: {
            dependencyType: "stateVariable",
            variableName: "nDimensions",
          },
          endpoint: {
            dependencyType: "stateVariable",
            variableName: "endpoint",
          },
        }

      },

      definition({ dependencyValues }) {
        if (Number.isNaN(dependencyValues.nDimensions)) {
          return null;
        }

        let endpoint = dependencyValues.endpoint;
        let numericalEndpoint = [];
        for (let ind = 0; ind < dependencyValues.nDimensions; ind++) {
          let val = endpoint[ind].evaluate_to_constant();
          if (!Number.isFinite(val)) {
            val = NaN;
          }
          numericalEndpoint.push(val);
        }


        return { setValue: { numericalEndpoint } }
      }
    }

    stateVariableDefinitions.numericalThroughpoint = {
      forRenderer: true,
      returnDependencies() {
        return {
          nDimensions: {
            dependencyType: "stateVariable",
            variableName: "nDimensions",
          },
          through: {
            dependencyType: "stateVariable",
            variableName: "through",
          },
        }

      },

      definition({ dependencyValues }) {
        if (Number.isNaN(dependencyValues.nDimensions)) {
          return null;
        }

        let through = dependencyValues.through;
        let numericalThroughpoint = [];
        for (let ind = 0; ind < dependencyValues.nDimensions; ind++) {
          let val = through[ind].evaluate_to_constant();
          if (!Number.isFinite(val)) {
            val = NaN;
          }
          numericalThroughpoint.push(val);
        }


        return { setValue: { numericalThroughpoint } }
      }
    }


    stateVariableDefinitions.nearestPoint = {
      returnDependencies: () => ({
        nDimensions: {
          dependencyType: "stateVariable",
          variableName: "nDimensions"
        },
        numericalEndpoint: {
          dependencyType: "stateVariable",
          variableName: "numericalEndpoint"
        },
        numericalThroughpoint: {
          dependencyType: "stateVariable",
          variableName: "numericalThroughpoint"
        },
      }),
      definition({ dependencyValues }) {

        let A1 = dependencyValues.numericalEndpoint[0];
        let A2 = dependencyValues.numericalEndpoint[1];
        let B1 = dependencyValues.numericalThroughpoint[0];
        let B2 = dependencyValues.numericalThroughpoint[1];

        let haveConstants = Number.isFinite(A1) && Number.isFinite(A2) &&
          Number.isFinite(B1) && Number.isFinite(B2);


        // only implement for 
        // - 2D
        // - constant endpoint/through and 
        // - non-degenerate parameters
        let skip = dependencyValues.nDimensions !== 2
          || !haveConstants
          || (B1 === A1 && B2 === A2);


        return {
          setValue: {
            nearestPoint: function ({ variables, scales }) {

              if (skip) {
                return {};
              }

              let xscale = scales[0];
              let yscale = scales[1];

              let BA1 = (B1 - A1) / xscale;
              let BA2 = (B2 - A2) / yscale;
              let denom = (BA1 * BA1 + BA2 * BA2);

              let t = ((variables.x1 - A1) / xscale * BA1 + (variables.x2 - A2) / yscale * BA2) / denom;

              let result = {};

              if (t <= 0) {
                result = { x1: A1, x2: A2 };
              } else {
                result = {
                  x1: A1 + t * BA1 * xscale,
                  x2: A2 + t * BA2 * yscale,
                };
              }

              if (variables.x3 !== undefined) {
                result.x3 = 0;
              }

              return result;

            }
          }
        }
      }
    }


    return stateVariableDefinitions;
  }


  async moveRay({ endpointcoords, throughcoords, transient, skippable, sourceInformation, actionId }) {

    let updateInstructions = [];

    if (endpointcoords !== undefined) {

      // if based on both through and direction
      // then set direction as through - endpoint
      if (await this.stateValues.basedOnThrough && await this.stateValues.basedOnDirection) {

        let direction;
        if (throughcoords === undefined) {
          // use current value of through
          // if through isn't supposed to change
          let numericalThroughpoint = await this.stateValues.numericalThroughpoint;
          direction = endpointcoords.map((x, i) => numericalThroughpoint[i] - x);

        } else {
          direction = endpointcoords.map((x, i) => throughcoords[i] - x);
        }

        updateInstructions.push({
          updateType: "updateValue",
          componentName: this.componentName,
          stateVariable: "direction",
          value: direction.map(x => me.fromAst(x)),
          sourceInformation
        })

      } else {
        // set endpoint directly
        updateInstructions.push({
          updateType: "updateValue",
          componentName: this.componentName,
          stateVariable: "endpoint",
          value: endpointcoords.map(x => me.fromAst(x)),
          sourceInformation
        })
      }

      if (throughcoords === undefined) {
        // if set endpoint but not through, the idea is that through shouldn't move
        // however, through would move if not based on through
        // so give instructions to change direction to keep through fixed
        if (!await this.stateValues.basedOnThrough) {
          let numericalThroughpoint = await this.stateValues.numericalThroughpoint;
          let direction = endpointcoords.map((x, i) => numericalThroughpoint[i] - x);
          updateInstructions.push({
            updateType: "updateValue",
            componentName: this.componentName,
            stateVariable: "direction",
            value: direction.map(x => me.fromAst(x)),
            sourceInformation
          })
        }
      }
    }

    if (throughcoords !== undefined) {

      // for through, we'll set it directly if based on through
      if (await this.stateValues.basedOnThrough) {
        updateInstructions.push({
          updateType: "updateValue",
          componentName: this.componentName,
          stateVariable: "through",
          value: throughcoords.map(x => me.fromAst(x)),
          sourceInformation
        })
      } else {
        // if not based on through
        // then update direction instead of through

        if (endpointcoords == undefined) {
          endpointcoords = await this.stateValues.numericalEndpoint;
        }
        let direction = endpointcoords.map((x, i) => throughcoords[i] - x);
        updateInstructions.push({
          updateType: "updateValue",
          componentName: this.componentName,
          stateVariable: "direction",
          value: direction.map(x => me.fromAst(x)),
          sourceInformation
        })
      }


      if (endpointcoords === undefined) {
        // if set through but not endpoint, the idea is that endpoint shouldn't move
        // however, endpoint would move if based on direction and through
        // so give instructions to change direction to keep endpoint fixed
        if (await this.stateValues.basedOnThrough && await this.stateValues.basedOnDirection) {
          let numericalEndpoint = await this.stateValues.numericalEndpoint;
          let direction = throughcoords.map((x, i) => x - numericalEndpoint[i]);
          updateInstructions.push({
            updateType: "updateValue",
            componentName: this.componentName,
            stateVariable: "direction",
            value: direction.map(x => me.fromAst(x)),
            sourceInformation
          })
        }
      }

    }

    if (transient) {
      return await this.coreFunctions.performUpdate({
        updateInstructions,
        transient,
        skippable,
        actionId,
      });
    } else {
      return await this.coreFunctions.performUpdate({
        updateInstructions,
        actionId,
        event: {
          verb: "interacted",
          object: {
            componentName: this.componentName,
            componentType: this.componentType,
          },
          result: {
            through: throughcoords,
            endpoint: endpointcoords,
          }
        }
      });
    }

  }

  async rayClicked({ actionId }) {

    await this.coreFunctions.triggerChainedActions({
      triggeringAction: "click",
      componentName: this.componentName,
    })

    this.coreFunctions.resolveAction({ actionId });

  }


}