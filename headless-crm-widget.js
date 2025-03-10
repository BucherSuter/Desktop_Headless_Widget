import { Desktop } from '@wxcc-desktop/sdk';

// This is the logger initializer factory method for the headless widget
export const logger = Desktop.logger.createLogger('headless-widget'); 

// Some sample data points
let callStartTime = 0 , callEndTime = 0 , callDuration = 0;
let agentName, agentState = '';
let isInitialized = false;
let callType = 'Outbound';

customElements.define(
  'headless-crm-widget',
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

  // Mounting the headless widget and initializing
  async connectedCallback() 
  {
    this.init(); 
    logger.info('Headless Widget Log: Webcomponent connectedCallback function');
    this.getAgentInfo();
  }
  getAgentInfo() {
    const latestData = Desktop.agentStateInfo.latestData;
    logger.info('myLatestData' +JSON.stringify(latestData));
  }

  // Init Method - called to configure the WebexCC Desktop JS SDK inside the headless widget
  async init() 
  {  
    await Desktop.config.init();
    logger.info('Headless Widget Log: init function');
    this.registerEventListeners();
    this.detectlocked();
  }

  async detectlocked(){
    console.log("Visibility Changed start");
    document.addEventListener("visibilitychange", async (e) => {
      console.log("Visibility Changed" +e);
    }); 
  }
 

async makecall(){


          const accessToken = await Desktop.actions.getToken();
          var URL = "https://webexapis.com/v1/telephony/calls";
            const response1 = await fetch(URL, {
              headers: {Authorization: 'Bearer '+accessToken}
            });
            const opencalls = await response1.json();
            const opencallid = opencalls.items[0].id;
            console.log("CallID:" +opencallid);
    
            var URL = "https://webexapis.com/v1/telephony/calls/answer";
            const response11 = await fetch(URL, {
              method: 'POST',
              headers: {Authorization: 'Bearer '+accessToken, 'Content-Type': 'application/json'},
              body: JSON.stringify({callId: opencallid})
            });
            const userstatus1 = await response11.json();
            console.log(userstatus1);
  }
  // This method registers all the event listeners supported by the JS SDK.
  // The event listeners are asynchronous and require handlers within each of the listeners.
  // Sample handlers below are only console logs as examples
  async registerEventListeners()
  {

    // Listener for agent state change event
    Desktop.agentStateInfo.addEventListener('updated', (agentInfo) => {
      logger.info('Headless Widget Log: agentInfo : ' + JSON.stringify(agentInfo));
      beep();
      if(isInitialized === false)
      {
        agentName = agentInfo.find(item => item.name === 'agentName').value;
      }
      else
      {
        logger.info('Headless Widget Log: Agent state has changed.. !!!');

        if(agentInfo.some(obj => obj.value === 'Available') === true)
          agentState = agentInfo.find(item => item.name === 'subStatus').value;
        else
          agentState = agentInfo.find(item => item.name === 'idleCode').value['name'];

        logger.info('Headless Widget Log: Agent State is : ' + agentState);
      }

      if(agentState === 'Make OutDial Call')
        this.makeOutDialCall();

      isInitialized = true;
    });


    // Listener for screenpop event
    Desktop.screenpop.addEventListener("eScreenPop", screenPopMsg => {
      screenPopMsg = JSON.stringify(screenPopMsg);
      screenPopMsg = JSON.parse(screenPopMsg);
      
      let screenPopName = screenPopMsg.data['screenPopName'];
      let screenPopUrl = screenPopMsg.data['screenPopUrl'];

      logger.info('Headless Widget Log: Screenpop Message Information --> ');
      logger.info('Headless Widget Log: ScreenPop Name : ' + screenPopName);
      logger.info('Headless Widget Log: ScreenPop URL : ' + screenPopUrl);
    });


    // Listener for agent contact offered event
    Desktop.agentContact.addEventListener('eAgentOfferContact', (agentContact) => {
      logger.info('Headless Widget Log: Agent Offered Contact' +agentContact.data['interaction'].callAssociatedDetails.ani);
      this.makecall();
    });


    // Listener for agent contact assigned event
    Desktop.agentContact.addEventListener('eAgentContactAssigned', (agentContactAssigned) => {
      logger.info('Headless Widget Log: Agent Assigned Contact');
      callStartTime = new Date();
    });


    // Wrap up event listener - and collection of contact metadata 
    Desktop.agentContact.addEventListener('eAgentContactWrappedUp', (contactWrappedUp) => {
      logger.info('Headless Widget Log: Contact wrapped up! Here is the Contact Information --> ');
      logger.info('Headless Widget Log: WrapUpInfo : ' + contactWrappedUp);
      
      contactWrappedUp = JSON.stringify(contactWrappedUp);
      contactWrappedUp = JSON.parse(contactWrappedUp);
      
      callEndTime = new Date();
      callDuration = (callEndTime - callStartTime) / 1000;

      let wrapUpId = contactWrappedUp.data['wrapUpAuxCodeId'];
      let agentID = contactWrappedUp.data['agentId'];
      let interactionId = contactWrappedUp.data['interaction'].interactionId;
      let ani = contactWrappedUp.data['interaction'].callAssociatedDetails.ani;
      let dn = contactWrappedUp.data['interaction'].callAssociatedDetails.dn;
      let callType = contactWrappedUp.data['interaction'].contactDirection.type
      let wrapUpReason = contactWrappedUp.data['type']
      let queueName = contactWrappedUp.data['interaction'].callAssociatedDetails.virtualTeamName;
      let cadCaseNo;

      if(callType === 'Inbound')
      {
        cadCaseNo = contactWrappedUp.data['interaction'].callAssociatedData.Case_Number.value;
      }
      
      this.findWrapUpCode(wrapUpId);
       
      logger.info('Headless Widget Log: ANI is : ' + ani);
      logger.info('Headless Widget Log: DNIS is : ' + dn);
      logger.info('Headless Widget Log: Cad Variable Case Number is : ' + cadCaseNo);
      logger.info('Headless Widget Log: Agent ID is : ' + agentID);
      logger.info('Headless Widget Log: Agent Name : ' + agentName);
      logger.info('Headless Widget Log: Queue Name : ' + queueName);
      logger.info('Headless Widget Log: Interaction ID is : ' + interactionId);
      logger.info('Headless Widget Log: Type of call is : ' + callType);
      logger.info('Headless Widget Log: Call Duration : ' + callDuration + ' s');
      logger.info('Headless Widget Log: Wrap up Reason : ' + wrapUpReason);
    });
  } 	


  // Collect Wrap up code data and print to console 
  async findWrapUpCode(wrapUpID) 
  {
    let wrapUpInfo = await Desktop.actions.getWrapUpCodes();
    wrapUpInfo =  JSON.stringify(wrapUpInfo);
    wrapUpInfo = JSON.parse(wrapUpInfo);

    let wrapUpCode = wrapUpInfo.find(code => code.id === wrapUpID).name;
    logger.info('Headless Widget Log: Wrap Up Code selected : ' + wrapUpCode);    
  }
    

  // method to make an OutDial Call
  async makeOutDialCall()
  {
    callType = 'Outbound';
    try {
      const outDial = await Desktop.dialer.startOutdial({
      data: {
          entryPointId: '57a9b978-206f-48bd-a340-770b61ca83c4', // OutDial Entry Point ID
          destination: '14806754111', // user phone number
          direction: 'OUTBOUND', // either INBOUND or OUTBOUND
          origin: '+14806754084', // OutDial ANI with country code
          attributes: {},
          mediaType: 'telephony',
          outboundType: 'OUTDIAL',
         }
      });
      logger.info('Headless Widget Log: Dialer outdial : ' + JSON.stringify(outDial));
    }
    catch (error) {
      logger.info('Headless Widget Log: Dialer Error Message : ' + error);
      Desktop.dialer.addEventListener("eOutdialFailed", msg => logger.info('Headless Widget Log: ' + msg));
    }
  }

  disconnectedCallback() {;}

});

function beep() {
  var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
  snd.play();
}
