import React, { useEffect, useState } from "react";
import { Styles, 
    Table, 
    studentData, 
    attemptData, 
    assignmentData,
    attemptDataQuerry,
    studentDataQuerry,
    overViewDataQuerry 
 } from "./Gradebook"

import {
    atom,
    useSetRecoilState,
    useRecoilState,
    useRecoilValue,
    useRecoilValueLoadable,
    useRecoilCallback
  } from "recoil";
 
import { pageToolViewAtom, searchParamAtomFamily } from '../NewToolRoot';
import { useToast, toastType } from '../Toast';
import ButtonGroup from "../../../_reactComponents/PanelHeaderComponents/ButtonGroup";
import Button from "../../../_reactComponents/PanelHeaderComponents/Button";
import DropdownMenu from "../../../_reactComponents/PanelHeaderComponents/DropdownMenu";
import { suppressMenusAtom } from '../NewToolRoot';
import { effectivePermissionsByCourseId } from "../../../_reactComponents/PanelHeaderComponents/RoleDropdown";
import axios from "axios";

export const processGradesAtom = atom({
    key: 'processGradesAtom',
    default: 'Assignment Table',
  });

export const headersGradesAtom = atom({
        key: 'headersGradesAtom',
        default: [],
    });

export const entriesGradesAtom = atom({
        key: 'entriesGradesAtom',
        default: [],
    });

const getUserId = (students, name) => {
    console.log(students, name)
    for(let userId in students){
        //console.log(userId, students[userId].firstName);
        
        if(students[userId].firstName + " " + students[userId].lastName == name){
          return userId;
        }
      }
    return -1;
} 

function UploadChoices({ doenetId, maxAttempts }){
    let headers = useRecoilValue(headersGradesAtom);
    let rows = useRecoilValue(entriesGradesAtom);
    const addToast = useToast();
    const setProcess = useSetRecoilState(processGradesAtom);
    let assignments = useRecoilValueLoadable(assignmentData);
    let [scoreIndex,setScoreIndex] = useState(null);
    let [selectedColumnIndex,setSelectedColumnIndex] = useState(1);
    let [attemptNumber,setAttemptNumber] = useState(null);
    let [selectedAttemptIndex,setSelectedAttemptIndex] = useState(1);
    //Need points for assignment, but wait for loaded

    const refreshGradebook = useRecoilCallback(({set,snapshot})=> 
    async ({doenetId, addToast})=>{
        const driveId = await snapshot.getPromise(searchParamAtomFamily('driveId'));

        let doenetIdPayload = { params: { doenetId } };
        let driveIdPayload = {params: { driveId }}

        let attemptData = await axios.get('/api/loadGradebookAssignmentAttempts.php', doenetIdPayload)
        let studentData = await axios.get('/api/loadGradebookEnrollment.php', driveIdPayload)
        let overView = await axios.get('/api/loadGradebookOverview.php', driveIdPayload)

        set(attemptDataQuerry(doenetId),attemptData.data);
        set(studentDataQuerry,studentData.data);
        set(overViewDataQuerry,overView.data);

        addToast(`Updated scores!`);
        set(processGradesAtom,'Assignment Table')
    })
    if (assignments.state !== 'hasValue'){
        return null;
    }
    const totalPointsOrPercent = assignments.contents?.[doenetId]?.totalPointsOrPercent;

    if (!headers.includes("SIS User ID")){
        addToast("Need a column header named 'SIS User ID' ", toastType.ERROR);
        setProcess('Assignment Table')
        return null;
    }

    let columnIndexes = [];
    let validColumns = headers.filter((value,i)=>{
        //TODO: Handle percent.  We need number to handle 200.00 is 200
        let columnPoints = Number(rows?.[0]?.[i])
        if (columnPoints == totalPointsOrPercent){ columnIndexes.push(i) }
        return columnPoints == totalPointsOrPercent;
    })

    if (validColumns.length < 1){
        addToast(`Need a column with an assignment worth ${totalPointsOrPercent} points`, toastType.ERROR);
        setProcess('Assignment Table')
        return null;
    }

    if (!scoreIndex){
        setScoreIndex(columnIndexes[0]) //Default to the first one
    }
    
    let tableRows = [];
    let emails = [];
    let scores = [];
    for (let row of rows){
        let name = row[0];
        let id = row[1];
        let email = row[3];
        let score = row[scoreIndex];
        
        if (email !== ''){
            emails.push(email); //needed for payload
            scores.push(score); //needed for payload
            tableRows.push(<tr> <td>{name}</td><td>{email}</td><td>{id}</td><td>{score}</td></tr>)
        }
    }

    let importTable = <table>
            <tr>
            <th style={{width:'200px'}}>Student</th>
            <th style={{width:'200px'}}>Email</th>
            <th style={{width:'100px'}}>ID</th>
            <th style={{width:'50px'}}>Score</th>
            </tr>

           {tableRows}

    </table>

    let dropdownItems = [];
    for (let [i,name] of Object.entries(validColumns)){
        dropdownItems.push([i,name])
    }

    let attemptDropdownItems = [];
    if (attemptNumber === null){
        attemptDropdownItems.push([0,`Select Attempt Number`])
    }

    for (let i = 1; i <= maxAttempts; i++){
        attemptDropdownItems.push([i,`Attempt Number ${i}`])
    }
    attemptDropdownItems.push([Number(maxAttempts) + 1,`New Attempt Number`])


    let descriptionOfUpload = null;
    if (attemptNumber){
        if (Number(maxAttempts) + 1 === attemptNumber){
            //insert
            descriptionOfUpload = <div>Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> to insert a new <b>Attempt Number {attemptNumber}</b>?</div>
        }else{
            //update
            descriptionOfUpload = <div>Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> to change <b>Attempt Number {attemptNumber}</b> scores?</div>

        }
    }

    {attemptNumber ? 
        <div>Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> as <b>Attempt Number {attemptNumber}</b> to {Number(maxAttempts) + 1 === attemptNumber ? 'insert' : 'override' } scores?</div>
        : null }

    return <>
    <div>{validColumns.length} column{validColumns.length > 1 ? 's' : null} match {totalPointsOrPercent} total points </div>
    <div><DropdownMenu items = {dropdownItems} valueIndex={selectedColumnIndex} width="400px" onChange={({value})=>{
        setSelectedColumnIndex(Number(value)+1)
        setScoreIndex(columnIndexes[value])
    }}/></div>
    <br />
    <div><DropdownMenu items = {attemptDropdownItems} valueIndex={selectedAttemptIndex} width="400px" onChange={({value})=>{
       setSelectedAttemptIndex(value);
       setAttemptNumber(value);
    }}/></div>
    <br />

    
    {descriptionOfUpload}
    <ButtonGroup>
        <Button alert value='Cancel' onClick={()=>{
            addToast(`Override Cancelled`);
            setProcess('Assignment Table')
            }}/>
            {attemptNumber ? 
            <Button value='Accept' onClick={()=>{
                
                let payload = {
                    doenetId,
                    attemptNumber,
                    emails,
                    scores
                    }
                axios.post('/api/saveOverrideGrades.php',payload)
                .catch((e)=>{
                    addToast(e, toastType.ERROR);
                    setProcess('Assignment Table')
                })
                .then(({data})=>{
                    if (data.success){
                    refreshGradebook({doenetId,addToast});
                    // addToast(`Updated scores!`);
                    // setProcess('Assignment Table')
       
                    }else{
                    console.log(">>>>data",data)
                    addToast(data.message, toastType.ERROR);
                    }
                    
                })
                
                }}/>
            : null}
        
    </ButtonGroup>
    <br />

    {importTable}
    </>
}


export default function GradebookAssignmentView(){
    const setPageToolView = useSetRecoilState(pageToolViewAtom);
    let doenetId = useRecoilValue(searchParamAtomFamily('doenetId'))
    let courseId = useRecoilValue(searchParamAtomFamily('courseId'))
    let attempts = useRecoilValueLoadable(attemptData(doenetId))
    let students = useRecoilValueLoadable(studentData)
    let [process,setProcess] = useRecoilState(processGradesAtom);
    const setSuppressMenus = useSetRecoilState(suppressMenusAtom);
    let { canViewAndModifyGrades} = useRecoilValue(effectivePermissionsByCourseId(courseId));
    let assignments = useRecoilValueLoadable(assignmentData);


    useEffect(()=>{
        if (canViewAndModifyGrades === "1"){
            setSuppressMenus(["GradeUpload"])
        }else{
            setSuppressMenus([])
        }
    },[canViewAndModifyGrades, setSuppressMenus])
    


    //Wait for attempts and students to load
    if(attempts.state !== 'hasValue' || students.state !== 'hasValue' || assignments.state !== 'hasValue'){
        return null;
    }

    const label = assignments.contents[doenetId].label;
    const totalPossiblePoints = Number(assignments.contents[doenetId]?.totalPointsOrPercent);
  
    let assignmentsTable = {}
    let maxAttempts = 0;

    for (let userId in attempts.contents) {
        if (attempts.contents[userId]?.attempts){
            let len = Object.keys(attempts.contents[userId].attempts).length;
            if (len > maxAttempts) maxAttempts = len;
        }
    }

    if (process === 'Upload Choice Table'){
        return <UploadChoices doenetId={doenetId} maxAttempts={maxAttempts}/>
    }


    assignmentsTable.headers = []
    assignmentsTable.headers.push(
        {
            Header: "Student",
            Footer: "Possible Points",
            accessor: "student",
            
        }
    )

    for (let i = 1; i <= maxAttempts; i++) {
        assignmentsTable.headers.push(
        {
            Header: "Attempt " + i,
            Footer: totalPossiblePoints,
            accessor: "a"+i,
            disableFilters: true,
            Cell: row  =><a onClick = {(e) =>{
                //TODO: proper access method from tableV8
                let name = row.cell.row.cells[0].value.props.children
                console.log(name)
                let userId = getUserId(students.contents, name);
                
                //e.stopPropagation()
                //open("calendar", "fdsa", "f001");

                setPageToolView({
                    page: 'course',
                    tool: 'gradebookStudentAssignment',
                    view: '',
                    params: { courseId, doenetId, userId, attemptNumber: i, previousCrumb: 'assignment'},
                })
            }}>{row.value}</a>
        })
    }

    assignmentsTable.headers.push({
        Header: "Assignment Total",
        Footer: totalPossiblePoints,
        accessor: "grade",
        disableFilters: true
    })

    assignmentsTable.rows = [];
    
 
    for (let userId in students.contents) {
        let firstName = students.contents[userId].firstName;
        let lastName = students.contents[userId].lastName;
        let row = {};

        let name = firstName + " " + lastName
        row["student"] = <a onClick = {(e) =>{
            setPageToolView({
                page: 'course',
                tool: 'gradebookStudentAssignment',
                view: '',
                params: { courseId, doenetId, userId, previousCrumb: 'assignment'},
            })
        }}>{name}</a>

     
            for (let i = 1; i <= maxAttempts; i++) {
                let attemptCredit = attempts.contents[userId]?.attempts[i];
                let pointsEarned = Math.round(attemptCredit * totalPossiblePoints * 100)/100;
           
                row[("a"+i)] = (attemptCredit === undefined) ? "" : pointsEarned
                // <Link to={`/attempt/?doenetId=${doenetId}&userId=${userId}&attemptNumber=${i}`}>
                // {
                //     attemptCredit ? attemptCredit * 100 + "%" : "" // if attemptCredit is `undefined`, we still want a table cell so that the footer column still shows up right.
                // }
                // </Link>
            }
            let totalCredit = attempts.contents[userId]?.credit;
            let totalPointsEarned = Math.round(totalCredit * totalPossiblePoints * 100)/100;
            row["grade"] = totalCredit ? totalPointsEarned : "0"
        

        
        
        assignmentsTable.rows.push(row);
    }
    

    return(
        <>
        <div style={{paddingLeft:"8px"}}><b>{label}</b></div>
        <div style={{paddingLeft:"8px"}}>{totalPossiblePoints} Points Possible</div>
    <Styles>
        <Table columns = {assignmentsTable.headers} data = {assignmentsTable.rows}/>
    </Styles>
    </>
    )

}
