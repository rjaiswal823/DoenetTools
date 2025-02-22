import React, {useState, useRef, useEffect, useLayoutEffect} from "../../_snowpack/pkg/react.js";
import {FontAwesomeIcon} from "../../_snowpack/pkg/@fortawesome/react-fontawesome.js";
import {faSearch, faTimes} from "../../_snowpack/pkg/@fortawesome/free-solid-svg-icons.js";
import styled from "../../_snowpack/pkg/styled-components.js";
const SearchBar = styled.input`
    margin: 0px -${(props) => props.inputWidth}px 0px 0px;
    height: 24px;
    border: ${(props) => props.alert ? "2px solid var(--mainRed)" : "var(--mainBorder)"};
    border-radius: var(--mainBorderRadius);
    position: relative;
    padding: 0px 70px 0px 30px;
    color: var(--canvastext);
    overflow: hidden;
    width: ${(props) => props.width === "menu" ? "130px" : "220px"};
    font-size: 14px;
    cursor: ${(props) => props.disabled ? "not-allowed" : "auto"};
    &:focus {
        outline: 2px solid ${(props) => props.alert ? "var(--mainRed)" : "var(--canvastext)"};
        outline-offset: 2px;
    }
`;
const CancelButton = styled.button`
    float: right;
    margin: 6px 0px 0px ${(props) => props.marginLeft}px;
    // margin: '6px 0px 0px 172px',
    position: absolute;
    z-index: 2;
    border: 0px;
    background-color: var(--canvas);
    visibility: ${(props) => props.cancelShown};
    color: var(--canvastext);
    overflow: hidden;
    outline: none;
    border-radius: 5px;
    &:focus {
        outline: 2px solid var(--canvastext);
    }
`;
const SubmitButton = styled.button`
    position: absolute;
    display: inline;
    margin: 0px 0px 0px -60px;
    z-index: 2;
    height: 28px;
    border: ${(props) => props.alert ? "2px solid var(--mainRed)" : "var(--mainBorder)"};
    background-color: ${(props) => props.disabled ? "var(--mainGray)" : "var(--mainBlue)"};
    color: ${(props) => props.disabled ? "var(--canvastext)" : "var(--canvas)"};
    border-radius: 0px 5px 5px 0px;
    cursor: ${(props) => props.disabled ? "not-allowed" : "pointer"};
    font-size: 12px;
    overflow: hidden;

    &:hover {
        color: var(--canvastext);
        background-color: ${(props) => props.disabled ? "var(--mainGray)" : "var(--lightBlue)"};
    }

    &:focus {
        outline: 2px solid ${(props) => props.alert ? "var(--mainRed)" : "var(--canvastext)"};
        outline-offset: 2px;
    }
`;
const Label = styled.p`
    font-size: 14px;
    display: ${(props) => props.labelVisible}; 
    margin: 0px 5px 2px 0px;
`;
const Container = styled.div`
    display: ${(props) => props.align};
    width: 235px;
    align-items: center;
`;
export default function Searchbar(props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cancelShown, setCancelShown] = useState("hidden");
  const labelVisible = props.label ? "static" : "none";
  const align = props.vertical ? "static" : "flex";
  const [marginLeft, setMarginLeft] = useState(props.noSearchButton ? 80 : 26);
  const alert = props.alert ? props.alert : null;
  const searchBarRef = useRef(0);
  useEffect(() => {
    if (searchBarRef) {
      let searchBar = document.querySelector("#searchbar");
      let inputWidth = searchBar.clientWidth;
      setTimeout(function() {
        setMarginLeft(inputWidth - (props.noSearchButton ? 23 : 77) - (props.width ? 90 : 0));
      }, 1e3);
    }
  }, [searchBarRef, props]);
  var searchIcon = {
    margin: "6px 0px 0px 6px",
    position: "absolute",
    zIndex: "1",
    color: "var(--canvastext)",
    overflow: "hidden"
  };
  var disable = "";
  if (props.disabled) {
    disable = "disabled";
  }
  ;
  var searchButton = /* @__PURE__ */ React.createElement(SubmitButton, {
    disabled: disable,
    alert,
    onClick: searchSubmitAction
  }, "Search");
  var width = "";
  if (props.width) {
    width = props.width;
  }
  ;
  if (props.noSearchButton) {
    searchButton = "";
  }
  ;
  var placeholder = "Search...";
  if (props.placeholder) {
    placeholder = props.placeholder;
  }
  ;
  var label = "";
  if (props.label) {
    label = props.label;
  }
  ;
  let autoFocus = false;
  if (props.autoFocus) {
    autoFocus = true;
  }
  ;
  function clearInput() {
    setSearchTerm("");
    setCancelShown("hidden");
    if (props.onChange) {
      props.onChange("");
    }
  }
  ;
  function onChange(e) {
    let val = e.target.value;
    setSearchTerm(val);
    if (val === "") {
      setCancelShown("hidden");
    } else {
      setCancelShown("visible");
    }
    if (props.onChange) {
      props.onChange(val);
    }
  }
  ;
  function handleBlur(e) {
    if (props.onBlur)
      props.onBlur(e);
  }
  ;
  function handleKeyDown(e) {
    if (props.onKeyDown)
      props.onKeyDown(e);
  }
  ;
  function searchSubmitAction() {
    if (props.onSubmit) {
      props.onSubmit(searchTerm);
    }
  }
  ;
  return /* @__PURE__ */ React.createElement(Container, {
    align
  }, /* @__PURE__ */ React.createElement(Label, {
    id: "search-label",
    labelVisible,
    align
  }, label), /* @__PURE__ */ React.createElement("div", {
    style: {display: "table-cell"}
  }, /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
    icon: faSearch,
    style: searchIcon
  }), /* @__PURE__ */ React.createElement(CancelButton, {
    "aria-label": "Clear",
    ref: searchBarRef,
    cancelShown,
    marginLeft,
    onClick: () => {
      clearInput();
    }
  }, /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
    icon: faTimes
  })), /* @__PURE__ */ React.createElement(SearchBar, {
    id: "searchbar",
    type: "text",
    width,
    placeholder,
    onChange,
    onBlur: (e) => {
      handleBlur(e);
    },
    onKeyDownCapture: (e) => {
      handleKeyDown(e);
    },
    disabled: disable,
    alert,
    value: searchTerm,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === "Spacebar" || e.key === " ") {
        searchSubmitAction();
      }
    },
    autoFocus,
    "aria-labelledby": "search-label",
    "aria-disabled": props.disabled ? true : false
  }), /* @__PURE__ */ React.createElement("div", {
    style: {padding: "3px", display: "inline"}
  }), searchButton));
}
;
