import React, { useState } from 'react';
import { useRecoilValue, useRecoilCallback } from 'recoil';
// import Cookies from 'js-cookie'; // import Textinput from "../imports/Textinput";
import axios from 'axios';
import { useToast, toastType } from '../../../Tools/_framework/Toast';
import { searchParamAtomFamily, pageToolViewAtom } from '../NewToolRoot';
import Button from '../../../_reactComponents/PanelHeaderComponents/Button';
import ButtonGroup from '../../../_reactComponents/PanelHeaderComponents/ButtonGroup';
import SearchBar from '../../../_reactComponents/PanelHeaderComponents/SearchBar';
import { formatAMPM, UTCDateStringToDate } from '../../../_utils/dateUtilityFunction';

export default function ChooseLearnerPanel(props) {
  const doenetId = useRecoilValue(searchParamAtomFamily('doenetId'));
  const courseId = useRecoilValue(searchParamAtomFamily('courseId'));
  let [stage, setStage] = useState('request password');
  let [code, setCode] = useState('');
  let [learners, setLearners] = useState([]);
  let [exams, setExams] = useState([]);
  let [examsById, setExamsById] = useState({});
  let [choosenLearner, setChoosenLearner] = useState(null);
  let [filter, setFilter] = useState('')
  let [resumeAttemptFlag, setResumeAttemptFlag] = useState(false);

  const addToast = useToast();

  const newAttempt = useRecoilCallback(({ set, snapshot }) => async (doenetId, code, userId, resumeAttemptFlag) => {

    if (!resumeAttemptFlag) {
      const { data } = await axios.get('/api/incrementAttemptNumberForExam.php', {
        params: { doenetId, code, userId },
      })
    }

    // console.log(">>>>data 2",data)
    // console.log(">>>>",doenetId,code,userId)

    location.href = `/api/examjwt.php?userId=${encodeURIComponent(
      choosenLearner.userId,
    )}&doenetId=${encodeURIComponent(doenetId)}&code=${encodeURIComponent(code)}`;

  })

  const setDoenetId = useRecoilCallback(({ set }) => async (doenetId, courseId) => {
    set(pageToolViewAtom, (was) => {
      let newObj = { ...was };
      if (doenetId) {
        newObj.params = { doenetId, courseId }
      } else {
        newObj.params = { courseId }
      }
      return newObj
    })
  });

  // console.log(`>>>>stage '${stage}'`)

  if (stage === 'request password' || stage === 'problem with code') {
    return <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '20',
      }}
    >
      <img
        style={{ width: '250px', height: '250px' }}
        alt="Doenet Logo"
        src={'/media/Doenet_Logo_Frontpage.png'}
      />
      <div style={{ leftPadding: "10px" }}>
        <label>
          <div style={{ weight: 'bold' }}>Enter Passcode </div>

          <input
            type="password"
            value={code}
            data-test="signinCodeInput"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setStage('check code');
              }
            }}
            onChange={(e) => {
              setCode(e.target.value);
            }}
          />
        </label>
        <div>
          <button
            style={{}}
            onClick={() => setStage('check code')}
            data-test="signInButton"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  }

  if (stage === 'check code') {

    const checkCode = async (code) => {
      let { data } = await axios.get('/api/checkPasscode.php', { params: { code, doenetId, courseId } })
      // console.log("data", data)
      if (data.success) {
        setStage('choose exam');
        setLearners(data.learners);
        setExams(data.exams);
        let nextExamsById = {}
        for (let examInfo of data.exams) {
          nextExamsById[examInfo.doenetId] = examInfo;
        }
        setExamsById(nextExamsById);

      } else {
        addToast(data.message);
        setStage('problem with code');
      }

    }
    checkCode(code);

  }

  //https://localhost/#/exam?tool=chooseLearner&courseId=fjVHU0x9nhv3DMmS5ypqQ
  if (stage === 'choose exam') {
    // console.log(">>>>exams",exams);

    if (exams.length < 1) {
      return <h1>No Exams Available!</h1>
    }
    let examRows = [];
    for (let exam of exams) {
      examRows.push(<tr>
        <td style={{ textAlign: "center" }}>{exam.label}</td>
        {/* <td style={{textAlign:"center"}}>{exam.info}</td> */}
        <td style={{ textAlign: "center" }}><button onClick={() => {
          setDoenetId(exam.doenetId, courseId)
          setStage('choose learner');
        }}>Choose</button></td>
      </tr>)
    }
    //Need search and filter
    return <div>

      <table>
        <thead>
          <th style={{ width: "200px" }}>Exam</th>
          {/* <th style={{width:"200px"}}>Info</th> */}
          <th style={{ width: "100px" }}>Choose</th>
        </thead>
        <tbody>
          {examRows}
        </tbody>
      </table>
    </div>;
  }

  if (stage === 'choose learner') {
    if (!doenetId) { return null; }
    if (learners.length < 1) {
      return <h1>No One is Enrolled!</h1>
    }
    let learnerRows = [];

    let examTimeLimit = examsById[doenetId].timeLimit;

    for (let learner of learners) {
      //filter
      if (
        !learner.firstName.toLowerCase().includes(filter.toLowerCase()) &&
        !learner.lastName.toLowerCase().includes(filter.toLowerCase())
      ) {
        continue;
      }

      let timeZoneCorrectLastExamDate = null;
      let allowResume = false;

      if (learner.exam_to_date[doenetId]) {

        let lastExamDT = UTCDateStringToDate(learner.exam_to_date[doenetId]);

        allowResume = examTimeLimit === null;
        let minutesRemainingPhrase = null;

        if (!allowResume) {
          let users_timeLimit_minutes = Number(examTimeLimit) * Number(learner.timeLimitMultiplier)

          let minutes_remaining;
          if (users_timeLimit_minutes) {
            let users_exam_end_DT = new Date(lastExamDT.getTime() + users_timeLimit_minutes * 60 * 1000)
            let now = new Date();
            minutes_remaining = (users_exam_end_DT.getTime() - now.getTime()) / (1000 * 60)
          }

          if (minutes_remaining && minutes_remaining > 1) {
            allowResume = true;
            minutesRemainingPhrase = `${Math.round(minutes_remaining)} mins remain`
          };
        }

        if (allowResume) {
          if (!minutesRemainingPhrase) {
            let time = formatAMPM(lastExamDT)
            minutesRemainingPhrase = `${lastExamDT.getMonth() + 1}/${lastExamDT.getDate()} ${time}`;
          }
          timeZoneCorrectLastExamDate = <ButtonGroup>
            <Button value='Resume' onClick={() => {
              setChoosenLearner(learner);
              setStage('student final check');
              setResumeAttemptFlag(true)
            }} />
            {minutesRemainingPhrase}
          </ButtonGroup>
        } else if (lastExamDT) {
          let time = formatAMPM(lastExamDT)
          timeZoneCorrectLastExamDate = `${lastExamDT.getMonth() + 1}/${lastExamDT.getDate()} ${time}`;
        }

      }
      learnerRows.push(<tr>
        <td style={{ textAlign: "center" }}>{learner.firstName}</td>
        <td style={{ textAlign: "center" }}>{learner.lastName}</td>
        <td style={{ textAlign: "center" }}>{learner.studentId}</td>
        <td style={{ textAlign: "center" }}>{timeZoneCorrectLastExamDate}</td>
        <td style={{ textAlign: "center" }}><Button value='Start'
          onClick={() => {
            setChoosenLearner(learner);
            setStage('student final check');
            setResumeAttemptFlag(false);
          }} /></td>
      </tr>)
    }

    return <div>
      <div style={{ marginLeft: "50px", marginBottom: "15px" }}><SearchBar autoFocus onChange={setFilter} /></div>
      <table>
        <thead>
          <th style={{ width: "200px" }}>First Name</th>
          <th style={{ width: "200px" }}>Last Name</th>
          <th style={{ width: "200px" }}>Student ID</th>
          <th style={{ width: "240px" }}>Last Exam</th>
          <th style={{ width: "60px" }}>Choose</th>
        </thead>
        <tbody>
          {learnerRows}
        </tbody>
      </table>
    </div>;
  }

  if (stage === 'student final check') {
    let yesButtonText = "Yes It's me. Start Exam.";
    if (resumeAttemptFlag) {
      yesButtonText = "Yes It's me. Resume Exam.";
    }
    return <><div
      style={{
        fontSize: "1.5em",
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '20',

      }}
    >
      <div>
        <div><b>Is this you?</b></div>
        <div>Name: {choosenLearner.firstName} {choosenLearner.lastName}</div>
        <div>ID: {choosenLearner.studentId}</div>

      </div>
      <ButtonGroup>
        <Button alert value='No' onClick={() => {
          setStage('request password');
          setCode('')
          setChoosenLearner(null);
          setDoenetId(null, courseId);
          setResumeAttemptFlag(false);
        }} />
        <Button value={yesButtonText} onClick={() => {

          newAttempt(doenetId, code, choosenLearner.userId, resumeAttemptFlag);

        }} />
      </ButtonGroup>
    </div>
    </>
  }


  return null;
}



  // // ** *** *** *** *** **
  // //Developer only sign in as devuser
  // //Comment this if statement out if you are working on
  // // sign in or multiple devices

  // // if (window.location.hostname === 'localhost') {
  // //   console.log('Auto Signing In Devuser');
  // //   let emailaddress = 'devuser@example.com';
  // //   let deviceName = 'Cacao tree';
  // //   let cookieSettingsObj = { path: '/', expires: 24000, sameSite: 'strict' };
  // //   Cookies.set('Device', deviceName, cookieSettingsObj);
  // //   Cookies.set('Stay', 1, cookieSettingsObj);
  // //   location.href = `/api/jwt.php?emailaddress=${encodeURIComponent(
  // //     emailaddress,
  // //   )}&nineCode=${encodeURIComponent(
  // //     '123456789',
  // //   )}&deviceName=${deviceName}&newAccount=${'0'}&stay=${'1'}`;
  // // }

  // // ** *** *** *** *** **

  // // Handle automatically sign in when running Cypress tests
  // // if (window.Cypress) {
  // //   let emailaddress = 'devuser@example.com';
  // //   let deviceName = 'Cacao tree';
  // //   let cookieSettingsObj = { path: '/', expires: 24000, sameSite: 'strict' };
  // //   Cookies.set('Device', deviceName, cookieSettingsObj);
  // //   Cookies.set('Stay', 1, cookieSettingsObj);
  // //   location.href = `/api/jwt.php?emailaddress=${encodeURIComponent(
  // //     emailaddress,
  // //   )}&nineCode=${encodeURIComponent(
  // //     '123456789',
  // //   )}&deviceName=${deviceName}&newAccount=${'0'}&stay=${'1'}`;
  // // }
