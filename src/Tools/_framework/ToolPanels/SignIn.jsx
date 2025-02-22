import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie'; // import Textinput from "../imports/Textinput";
import axios from 'axios';
import Button from '../../../_reactComponents/PanelHeaderComponents/Button';
import Textfield from '../../../_reactComponents/PanelHeaderComponents/Textfield';
import { useToast, toastType } from '../Toast.jsx';
import Checkbox from '../../../_reactComponents/PanelHeaderComponents/Checkbox';

export default function SignIn(props) {
  let [email, setEmail] = useState('');
  let [nineCode, setNineCode] = useState('');
  let [maxAge, setMaxAge] = useState(0); //'2147483647' sec

  let [signInStage, setSignInStage] = useState('beginning');
  let [isSentEmail, setIsSentEmail] = useState(false);
  let [deviceName, setDeviceName] = useState('');
  let [sendEmailAlert, setSendEmailAlert] = useState(false);
  let [signInAlert, setSignInAlert] = useState(false);
  let [validEmail, setValidEmail] = useState(false);
  let [validCode, setValidCode] = useState(false);
  let [sendEmailDisabled, setSendEmailDisabled] = useState(true);
  let [signInDisabled, setSignInDisabled] = useState(true);

  console.log(signInStage);

  const jwt = Cookies.get();

  const emailRef = useRef(null);
  const codeRef = useRef(null);

  const toast = useToast();

  function validateEmail(inputEmail) {
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(inputEmail)) {
      setSendEmailDisabled(false);
      setValidEmail(true);
      setSendEmailAlert(false);
    } else {
      setSendEmailDisabled(true);
      setValidEmail(false);
      setSendEmailAlert(true);
    }
  }

  useEffect(() => {
    if (/\d{9}/.test(nineCode)) {
      setSignInDisabled(false);
      setValidCode(true);
      setSignInAlert(false);
    } else if (nineCode === '') {
      setSignInDisabled(true);
      setValidCode(false);
      setSignInAlert(false);
    } else {
      setSignInDisabled(true);
      setValidCode(false);
      setSignInAlert(true);
    }

    if (codeRef.current !== null && !validCode) {
      codeRef.current.focus();
    } else if (emailRef.current !== null && !validEmail) {
      emailRef.current.focus();
    }
  });

  //If already signed in go to course
  if (Object.keys(jwt).includes('JWT_JS')) {
    axios
      .get('/api/loadProfile.php', { params: {} })
      .then((resp) => {
        if (resp.data.success === '1') {
          localStorage.setItem('Profile', JSON.stringify(resp.data.profile));
          location.href = '/#/course';
        } else {
          //  Error currently does nothing
        }
      })
      .catch((error) => {
        console.log(error);
        //  Error currently does nothing
      });

    return null;
  }

  // ** *** *** *** *** **
  //Developer only sign in as devuser
  //Comment this if statement out if you are working on
  // sign in or multiple devices

  // if (window.location.hostname === 'localhost') {
  //   console.log('Auto Signing In Devuser');
  //   let emailaddress = 'devuser@example.com';
  //   let deviceName = 'Cacao tree';
  //   let cookieSettingsObj = { path: '/', expires: 24000, sameSite: 'strict' };
  //   Cookies.set('Device', deviceName, cookieSettingsObj);
  //   Cookies.set('Stay', 1, cookieSettingsObj);
  //   location.href = `/api/jwt.php?emailaddress=${encodeURIComponent(
  //     emailaddress,
  //   )}&nineCode=${encodeURIComponent(
  //     '123456789',
  //   )}&deviceName=${deviceName}&newAccount=${'0'}&stay=${'1'}`;
  // }

  // ** *** *** *** *** **

  // Handle automatically sign in when running Cypress tests
  if (window.Cypress) {
    let emailaddress = 'devuser@example.com';
    let deviceName = 'Cacao tree';
    let cookieSettingsObj = { path: '/', expires: 24000, sameSite: 'strict' };
    Cookies.set('Device', deviceName, cookieSettingsObj);
    Cookies.set('Stay', 1, cookieSettingsObj);
    location.href = `/api/jwt.php?emailaddress=${encodeURIComponent(
      emailaddress,
    )}&nineCode=${encodeURIComponent(
      '123456789',
    )}&deviceName=${deviceName}&newAccount=${'0'}&stay=${'1'}`;
  }

  if (signInStage === 'check code') {
    //Ask Server for data which matches email address

    const data = {
      emailaddress: email,
      nineCode: nineCode,
      deviceName: deviceName,
    };
    const payload = {
      params: data,
    };
    axios
      .get('/api/checkCredentials.php', payload)
      .then((resp) => {
        // console.log('checkCredentials resp',resp);

        if (resp.data.success) {
          let newAccount = '1';
          if (resp.data.existed) {
            newAccount = '0';
          }
          let stay = '0';
          if (maxAge > 0) {
            stay = '1';
          }

          // console.log(`/api/jwt.php?emailaddress=${encodeURIComponent(email)}&nineCode=${encodeURIComponent(nineCode)}&deviceName=${deviceName}&newAccount=${newAccount}&stay=${stay}`)
          location.href = `/api/jwt.php?emailaddress=${encodeURIComponent(
            email,
          )}&nineCode=${encodeURIComponent(
            nineCode,
          )}&deviceName=${deviceName}&newAccount=${newAccount}&stay=${stay}`;
        } else {
          if (resp.data.reason === 'Code expired') {
            setSignInStage('Code expired');
          } else if (resp.data.reason === 'Invalid Code') {
            setSignInStage('enter code');
            toast('Invalid code. Please try again.', toastType.ERROR);
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });
    setSignInStage('Loading');

    return null;
  }
  if (signInStage === 'Loading') {
    return (
      <div>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: '20',
          }}
        >
          <h2 style={{ textAlign: 'center' }}>Signing in...</h2>
        </div>
      </div>
    );
  }
  if (signInStage === 'Code expired') {
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: '20',
        }}
      >
        <h2 style={{ textAlign: 'center' }}>Code Expired</h2>
        <Button
          onClick={() => {
            location.href = '/#/signin';
          }}
          value="Restart Signin"
        ></Button>
      </div>
    );
  }

  if (signInStage === 'enter code' || signInStage === 'Invalid Code') {
    if (!isSentEmail) {
      const phpUrl = '/api/sendSignInEmail.php';
      const data = {
        emailaddress: email,
      };
      const payload = {
        params: data,
      };
      axios
        .get(phpUrl, payload)
        .then((resp) => {
          setDeviceName(resp.data.deviceName);
          let cookieSettingsObj = { path: '/', sameSite: 'strict' };
          if (maxAge > 0) {
            cookieSettingsObj.maxAge = maxAge;
          }
          // Cookies.set('Device', resp.data.deviceName, cookieSettingsObj);
          // Cookies.set('Stay', maxAge, cookieSettingsObj);
        })
        .catch((error) => {
          this.setState({ error: error });
        });
      setIsSentEmail(true);
    }

    let heading = <h2 style={{ textAlign: 'center' }}>Email Sent!</h2>;
    if (signInStage === 'Invalid Code') {
      heading = (
        <h2 style={{ textAlign: 'center' }}>Invalid Code. Try again.</h2>
      );
    }

    return (
      <div style={props.style}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: '20',
          }}
        >
          {heading}
          <div style={{ weight: 'bold', fontSize: '14px' }}>
            Device Name: {deviceName}
          </div>
          <div>
            <p style={{ fontSize: '14px' }}>
              Check your email for a code to complete sign in.
            </p>
          </div>
          <p>
            <Textfield
              label="Code (9 digit code):"
              // type="text"
              ref={codeRef}
              value={nineCode}
              data-test="signinCodeInput"
              alert={signInAlert}
              onKeyDown={(e) => {
                // Trying to make it so the user can copy and paste a correct code --> enable sign-in button
                // Basically trying to make it so the valid/invalid email is detected when the cursor is still within the textfield

                // if (((e.key === 'Enter') || ((e.ctrlKey || e.metaKey) && e.keyCode == 86)) && validCode) {
                if (e.key === 'Enter' && validCode) {
                  setSignInStage('check code');
                  // } else if (((e.key === 'Enter') || ((e.ctrlKey || e.metaKey) && e.keyCode == 86)) && !validCode) {
                } else if (e.key === 'Enter' && !validCode) {
                  toast(
                    'Invalid code format. Please enter 9 digits.',
                    toastType.ERROR,
                  );
                }
              }}
              onBlur={() => {
                if (!validCode && !signInAlert) {
                  toast(
                    'Invalid code format. Please enter 9 digits.',
                    toastType.ERROR,
                  );
                }
              }}
              onChange={(e) => {
                setNineCode(e.target.value);
              }}
            ></Textfield>
          </p>
          <Button
            disabled={signInDisabled}
            onClick={() => {
              if (validCode) {
                setSignInStage('check code');
              }
            }}
            data-test="signInButton"
            value="Sign In"
          ></Button>
        </div>
      </div>
    );
  }

  if (signInStage === 'beginning') {
    let stay = 0;
    if (maxAge > 0) {
      stay = 1;
    }
    return (
      <div style={props.style}>
        <div
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
          <div>
            <p style={{ marginLeft: '2px' }}>
              <Textfield
                label="Email Address:"
                // type="text"
                ref={emailRef}
                value={email}
                alert={sendEmailAlert}
                data-test="signinEmailInput"
                onKeyDown={(e) => {
                  validateEmail(email);
                  if (e.key === 'Enter' && validEmail) {
                    setSignInStage('enter code');
                  } else if (e.key === 'Enter' && !validEmail) {
                    toast('Invalid email. Please try again.', toastType.ERROR);
                  }
                }}
                onBlur={() => {
                  validateEmail(email);
                  if (!validEmail && !sendEmailAlert) {
                    toast('Invalid email. Please try again.', toastType.ERROR);
                  }
                }}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              ></Textfield>
            </p>
            <p style={{ fontSize: '14px' }}>
              <Checkbox
                checked={stay}
                onClick={(e) => {
                  if (!stay) {
                    // console.log('stay');
                    setMaxAge(240000); //2147483647 sec
                  } else {
                    // console.log('not stay');
                    setMaxAge(0);
                  }
                }}
              />{' '}
              Stay Logged In
            </p>
            <Button
              disabled={sendEmailDisabled}
              onClick={() => {
                if (validEmail) {
                  setSignInStage('enter code');
                }
              }}
              data-test="sendEmailButton"
              value="Send Email"
            ></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={props.style}>
      <div
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
        <h2 style={{ textAlign: 'center' }}>Loading...</h2>
      </div>
    </div>
  );
}
