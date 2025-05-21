import React, { useState, useEffect } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import './App.css'
import emailjs from '@emailjs/browser';

const WebCallApp = () => {
  const [retellWebClient] = useState(new RetellWebClient());
  const [isCallActive, setIsCallActive] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]); // Explicitly type as MediaDeviceInfo[]
  const [selectedMic, setSelectedMic] = useState<string>("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  // Fetch available audio devices
  const fetchDevices = async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = deviceInfos.filter(
        (device) => device.kind === "audioinput" || device.kind === "audiooutput"
      );
      setDevices(audioDevices); // Assign the filtered devices
      if (audioDevices.length) {
        setSelectedMic(audioDevices.find((d) => d.kind === "audioinput")?.deviceId || "default");
        setSelectedSpeaker(audioDevices.find((d) => d.kind === "audiooutput")?.deviceId || "");
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  // Fetch the access token from the API
  const fetchAccessToken = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api.retellai.com/v2/create-web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer key_31c35b40bde529d2eb00579bb673`, // Replace with your API token
        },
        body: JSON.stringify({
          agent_id: `${process.env.REACT_APP_RETELL_AGENTID}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status}`);
      }

      const data = await response.json();
      console.log("DATA----", data)
      setCallId(data.call_id)
      // localStorage.setItem("CallId", data.call_id)
      setAccessToken(data.access_token);
    } catch (error) {
      console.error("Error fetching access token:", error);
    } finally {
      setLoading(false);
    }
  };

  // Start the call
  const startCall = async () => {
    if (!accessToken) {
      console.error("Access token not available");
      return;
    }

    try {
      let call = await retellWebClient.startCall({
        accessToken,
        sampleRate: 24000,
        captureDeviceId: selectedMic,
        playbackDeviceId: selectedSpeaker,
        emitRawAudioSamples: false,
      });

      // console.log("Call---", call)
      setIsCallActive(true);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const sendEmail = (data: Record<string, any>, serviceID: string, templateId: string, publicKey: any) => {


    emailjs
      .send(serviceID, templateId, data, {
        publicKey:publicKey,
      })
      .then(
        () => {
          console.log('SUCCESS!');
        },
        (error) => {
          console.log('FAILED...', error.text);
        },
      );
  };

  // Stop the call
  const stopCall = async () => {
    try {
      retellWebClient.stopCall();
      setIsCallActive(false);
      setTimeout(async () => {
        try {
          // Fetch call data
          const getCallID = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer key_31c35b40bde529d2eb00579bb673`, // Replace with your API token
            },
          });
      
          const data = await getCallID.json();
          console.log("Get call Data--------", data);
      
          // Prepare values for upload
          const values = {
            callData: data.start_timestamp || "",
            serviceDesired: data.call_analysis.custom_analysis_data.reason_for_appointment || "",
            dateAndTime: data.call_analysis.custom_analysis_data.get_date_and_time || "",
            fullName: data.call_analysis.custom_analysis_data._full_name || "",
            email: data.call_analysis.custom_analysis_data.email || "",
            phone: data.call_analysis.custom_analysis_data.phone || "",
            birthday: data.call_analysis.custom_analysis_data.birthday || "",
            reasonForAppointment: data.call_analysis.custom_analysis_data.reason_for_appointment || "",
            dentalInsurance: data.call_analysis.custom_analysis_data.detal_insurance || "",
            callSummary: data.call_analysis.call_summary || "",
            transcript: data.transcript || "",
            recording: data.recording_url || "",
          };
      
          // Upload data to your endpoint
          const uploadData = await fetch("https://bitrox-dental.vercel.app/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
      
          // console.log("Upload Response:", await uploadData.json());
      
          // Send email using emailjs
          sendEmail(
            {
              name: data.call_analysis.custom_analysis_data._full_name,
              email: data.call_analysis.custom_analysis_data.email,
              date: data.call_analysis.custom_analysis_data.get_date_and_time
              
            },
           "service_4aeezgn",
            "template_e1h3mb8",
            "x9lzwA0HaG0gyPS8A"
          );
      
          console.log("Email sent successfully");
        } catch (error) {
          console.error("Error in processing:", error);
        }
      }, 5000); // 5-second delay
      
    } catch (error) {
      console.error("Error stopping call:", error);
    }
  };

  // Event listeners
  useEffect(() => {
    fetchDevices();

    retellWebClient.on("call_started", () => console.log("Call started"));
    retellWebClient.on("call_ended", () => {
      console.log("Call ended");
      setIsCallActive(false);
    });
    retellWebClient.on("error", (error) => {
      console.error("Error occurred:", error);
      stopCall();
    });

    retellWebClient.on("agent_start_talking", () => {
      console.log("agent_start_talking");
    });
    retellWebClient.on("agent_stop_talking", () => {
      console.log("agent_stop_talking");
    });

    retellWebClient.on("audio", (audio) => {
      console.log("Audio", audio);
    });

    retellWebClient.on("update", (update) => {
      // console.log("Update", update);
    });

    retellWebClient.on("metadata", async (metadata) => {
      console.log("Metadata", metadata);
    });

    return () => {
      retellWebClient.stopCall();
    };
  }, [retellWebClient]);

  return (
    <div className="web-call-app">
      <h1>Web Call Application</h1>
      <button onClick={fetchAccessToken} disabled={loading}>
        {loading ? "Fetching Calling response..." : "Fetch Token"}
      </button>
      <br />
      {devices.length > 0 && (
        <div className="device-selection">
          <label>
            Microphone:
            <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
              {devices.filter((d) => d.kind === "audioinput").map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Microphone"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Speaker:
            <select value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}>
              {devices.filter((d) => d.kind === "audiooutput").map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || "Speaker"}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {accessToken && (
        <>
          <button onClick={startCall} disabled={isCallActive}>
            Start Call
          </button>
          <button onClick={stopCall} disabled={!isCallActive}>
            Stop Call
          </button>
        </>
      )}
      {!accessToken && <p>Please fetch the access token first.</p>}
      <div style={{ marginTop: "20px" }}>
        <p>Status: {isCallActive ? "Call Active" : "Call Not Active"}</p>
        {isCallActive && <div className="call-animation">📞 On Call...</div>}
      </div>
    </div>
  );
};

export default WebCallApp;
