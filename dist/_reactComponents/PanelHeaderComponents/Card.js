import React from "../../_snowpack/pkg/react.js";
import styled from "../../_snowpack/pkg/styled-components.js";
const CardStyling = styled.button`
    background-image: linear-gradient(to bottom left, var(--canvas), var(--canvas), var(--canvas), var(--solidLightBlue));
    border-radius: 5px;
    width: 190px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--canvastext);
    border: 2px solid ${(props) => props.alert ? "var(--mainRed)" : props.disabled ? "var(--mainGray)" : "var(--canvastext)"};
    cursor: ${(props) => props.disabled ? "not-allowed" : "pointer"};

    &:focus {
        outline: 2px solid ${(props) => props.alert ? "var(--mainRed)" : props.disabled ? "var(--mainGray)" : "var(--canvastext)"};
        outline-offset: 2px;
    }
`;
export default function Card(props) {
  const labelVisible = props.label ? "static" : "none";
  const align = props.vertical ? "static" : "flex";
  var title = {
    value: "Card",
    fontSize: "24px",
    fontFamily: "Open Sans",
    margin: "0"
  };
  var label = {
    value: "Label:",
    fontSize: "14px",
    marginRight: "5px",
    display: `${labelVisible}`,
    margin: "0px 5px 2px 0px"
  };
  var container = {
    display: `${align}`,
    alignItems: "center"
  };
  if (props.value) {
    title.value = props.value;
  }
  var icon = "";
  if (props.icon) {
    icon = props.icon;
  }
  const iconVisible = props.icon ? /* @__PURE__ */ React.createElement("div", {
    style: {padding: "8px", fontSize: "20px"}
  }, icon) : "";
  if (props.label) {
    label.value = props.label;
  }
  function handleClick(e) {
    if (props.onClick)
      props.onClick(e);
  }
  return /* @__PURE__ */ React.createElement("div", {
    style: container
  }, /* @__PURE__ */ React.createElement("p", {
    style: label
  }, label.value), /* @__PURE__ */ React.createElement(CardStyling, {
    alert: props.alert,
    disabled: props.disabled,
    "aria-labelledby": label,
    "aria-label": title.value,
    onClick: (e) => {
      handleClick(e);
    }
  }, /* @__PURE__ */ React.createElement("h4", {
    style: title
  }, /* @__PURE__ */ React.createElement("b", null, title.value)), iconVisible));
}
