import React, {useState} from "../../_snowpack/pkg/react.js";
import {
  useRecoilCallback,
  useRecoilValue
} from "../../_snowpack/pkg/recoil.js";
import Button from "../../_reactComponents/PanelHeaderComponents/Button.js";
import {classTimesAtom} from "../Widgets/Next7Days.js";
import DropdownMenu from "../../_reactComponents/PanelHeaderComponents/DropdownMenu.js";
import DateTime from "../../_reactComponents/PanelHeaderComponents/DateTime.js";
import axios from "../../_snowpack/pkg/axios.js";
import {searchParamAtomFamily} from "../NewToolRoot.js";
import {FontAwesomeIcon} from "../../_snowpack/pkg/@fortawesome/react-fontawesome.js";
import {faTimes, faPlus} from "../../_snowpack/pkg/@fortawesome/free-solid-svg-icons.js";
import {recoilAddToast} from "../Toast.js";
import {DateToUTCDateString} from "../../_utils/dateUtilityFunction.js";
const TimeEntry = ({parentValue, valueCallback = () => {
}}) => {
  let [time, setTime] = useState(parentValue);
  let [previousTime, setPreviousTime] = useState(parentValue);
  if (parentValue != previousTime) {
    setTime(parentValue);
    setPreviousTime(parentValue);
  }
  return /* @__PURE__ */ React.createElement("input", {
    type: "text",
    value: time,
    style: {width: "40px"},
    onChange: (e) => {
      setTime(e.target.value);
    },
    onBlur: () => {
      if (previousTime !== time) {
        valueCallback(time);
        setPreviousTime(time);
      }
    },
    onKeyDown: (e) => {
      if (e.key === "Enter") {
        if (previousTime !== time) {
          valueCallback(time);
          setPreviousTime(time);
        }
      }
    }
  });
};
function sortClassTimes(classTimesArray) {
  return classTimesArray.sort((first, second) => {
    let mondayFirstDotw = first.dotwIndex;
    if (mondayFirstDotw === 0) {
      mondayFirstDotw = 7;
    }
    let mondaySecondDotw = second.dotwIndex;
    if (mondaySecondDotw === 0) {
      mondaySecondDotw = 7;
    }
    if (mondayFirstDotw > mondaySecondDotw) {
      return 1;
    } else if (mondayFirstDotw < mondaySecondDotw) {
      return -1;
    } else {
      let firstStartDate = new Date();
      const [firstHour, firstMinute] = first.startTime.split(":");
      firstStartDate.setHours(firstHour, firstMinute, 0, 0);
      let secondStartDate = new Date();
      const [secondHour, secondMinute] = second.startTime.split(":");
      secondStartDate.setHours(secondHour, secondMinute, 0, 0);
      if (firstStartDate > secondStartDate) {
        return 1;
      } else {
        return -1;
      }
    }
  });
}
export default function ClassTimes() {
  const timesObj = useRecoilValue(classTimesAtom);
  const addClassTime = useRecoilCallback(({set, snapshot}) => async () => {
    let was = await snapshot.getPromise(classTimesAtom);
    let newArr = [...was];
    const newClassTime = {
      dotwIndex: 1,
      startTime: "09:00",
      endTime: "10:00"
    };
    newArr.push(newClassTime);
    newArr = sortClassTimes(newArr);
    set(classTimesAtom, newArr);
    let courseId = await snapshot.getPromise(searchParamAtomFamily("courseId"));
    console.log(courseId);
    let dotwIndexes = [];
    let startTimes = [];
    let endTimes = [];
    for (let classTime of newArr) {
      dotwIndexes.push(classTime.dotwIndex);
      startTimes.push(classTime.startTime);
      endTimes.push(classTime.endTime);
    }
    let resp = await axios.post("/api/updateClassTimes.php", {
      courseId,
      dotwIndexes,
      startTimes,
      endTimes
    });
    let {data} = resp;
    console.log("resp: ", resp);
    console.log(">>>>data", data);
  });
  const updateClassTime = useRecoilCallback(({set, snapshot}) => async ({index, newClassTime}) => {
    let was = await snapshot.getPromise(classTimesAtom);
    let newArr = [...was];
    newArr[index] = {...newClassTime};
    newArr = sortClassTimes(newArr);
    console.log("update");
    set(classTimesAtom, newArr);
    let courseId = await snapshot.getPromise(searchParamAtomFamily("courseId"));
    let dotwIndexes = [];
    let startTimes = [];
    let endTimes = [];
    for (let classTime of newArr) {
      dotwIndexes.push(classTime.dotwIndex);
      startTimes.push(classTime.startTime);
      endTimes.push(classTime.endTime);
    }
    let resp = await axios.post("/api/updateClassTimes.php", {
      courseId,
      dotwIndexes,
      startTimes,
      endTimes
    });
    let {data} = resp;
    console.log(">>>>data", data);
  });
  const deleteClassTime = useRecoilCallback(({set, snapshot}) => async ({index}) => {
    let was = await snapshot.getPromise(classTimesAtom);
    let newArr = [...was];
    newArr.splice(index, 1);
    newArr = sortClassTimes(newArr);
    set(classTimesAtom, newArr);
    let courseId = await snapshot.getPromise(searchParamAtomFamily("courseId"));
    let dotwIndexes = [];
    let startTimes = [];
    let endTimes = [];
    for (let classTime of newArr) {
      dotwIndexes.push(classTime.dotwIndex);
      startTimes.push(classTime.startTime);
      endTimes.push(classTime.endTime);
    }
    let resp = await axios.post("/api/updateClassTimes.php", {
      courseId,
      dotwIndexes,
      startTimes,
      endTimes
    });
    let {data} = resp;
    console.log(">>>>data", data);
  });
  const dotwItems = [
    [1, "Monday"],
    [2, "Tuesday"],
    [3, "Wednesday"],
    [4, "Thursday"],
    [5, "Friday"],
    [6, "Saturday"],
    [0, "Sunday"]
  ];
  let timesJSX = [];
  for (let [index, timeObj] of Object.entries(timesObj)) {
    console.log("timeObj ", timeObj);
    console.log("timeObj.startTime", timeObj.startTime);
    timesJSX.push(/* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", {
      style: {width: "190px"}
    }, /* @__PURE__ */ React.createElement(DropdownMenu, {
      width: "180px",
      items: dotwItems,
      valueIndex: timeObj.dotwIndex,
      onChange: ({value}) => {
        let newClassTime = {...timeObj};
        newClassTime.dotwIndex = value;
        updateClassTime({index, newClassTime});
      }
    })), /* @__PURE__ */ React.createElement(Button, {
      icon: /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
        icon: faTimes
      }),
      alert: true,
      onClick: () => {
        deleteClassTime({index});
      }
    })), /* @__PURE__ */ React.createElement("tr", {
      style: {width: "190px", display: "flex", alignItems: "center"}
    }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(DateTime, {
      datePicker: false,
      width: "74px",
      value: new Date(timeObj.startTime),
      onBlur: (value, valid) => {
        let newClassTime = {...timeObj};
        newClassTime.startTime = DateToUTCDateString(new Date(value.value._d));
        updateClassTime({index, newClassTime});
      }
    })), /* @__PURE__ */ React.createElement("td", {
      style: {marginLeft: "6px", marginRight: "6px"}
    }, "-"), /* @__PURE__ */ React.createElement("td", {
      style: {["--menuPanelMargin"]: "-62px"}
    }, /* @__PURE__ */ React.createElement(DateTime, {
      datePicker: false,
      width: "74px",
      value: new Date(timeObj.endTime),
      onBlur: (value, valid) => {
        let newClassTime = {...timeObj};
        newClassTime.endTime = DateToUTCDateString(new Date(value.value._d));
        updateClassTime({index, newClassTime});
      }
    }))), /* @__PURE__ */ React.createElement("div", {
      style: {margin: "10px"}
    })));
  }
  let classTimesTable = /* @__PURE__ */ React.createElement("div", null, "No times set.");
  if (timesJSX.length > 0) {
    classTimesTable = /* @__PURE__ */ React.createElement("table", {
      style: {width: "230px", margins: "5px"}
    }, timesJSX);
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, classTimesTable, /* @__PURE__ */ React.createElement(Button, {
    icon: /* @__PURE__ */ React.createElement(FontAwesomeIcon, {
      icon: faPlus
    }),
    style: {margin: "auto"},
    onClick: () => addClassTime()
  }));
}
