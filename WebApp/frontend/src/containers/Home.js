// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import "./Home.scss";
import { OneColumnLayout } from "../components/layouts/OneColumnLayout";
import { Button } from "../components/forms/Button";
import { getS3Url, putDataForTraining } from "../libs/awsLib";
import { LoaderButton } from "../components/forms/LoaderButton";
import { getBase64 } from "./convertToBase64";
import { Row, Col } from "reactstrap";
import { Modal, ModalBody, ModalFooter } from "reactstrap";
import { Auth } from "aws-amplify";
import { API } from "aws-amplify";
import { Dimmer, Loader, Grid } from 'semantic-ui-react'
import { Header, Icon } from 'semantic-ui-react'
import { Card, Placeholder } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'
import { Tab } from 'semantic-ui-react'
import Webcam from "react-webcam"

export default class Home extends Component {
  constructor(props) {
    super(props);

    

    this.state = {
      percentages: "",
      latestUploadedFileUrl: "", // S3 URL of the Uploaded Image
      analyzedFileUrl: "", // URL for the Analyzed Image received from API
      isLoading: false,
      file: null,
      modal: false, 
      modalSelectedImageURL: "",  // URL of the Selected Image to be displayed on the Modal Window
      modalAnalyzedImageURL: "", // URL of the Analyzed Image to be displayed on the Modal Window
      isUploadingImageForTraining: false,
      fileForTraining: "",
      numberofImagesForTraining: "0", 
      isRefreshingImageForTraining: false,
      isLoadingTrainingBatchList: false,
      trainingImageBatchList: []
      
    };

    this.toggle = this.toggle.bind(this);
  }

  async componentDidMount() {
    try {
      await Auth.currentSession()
      

      this.getNumberOfImagesForTraining()
      this.refreshTrainingBatchList()

    } catch (e) {
      console.log("e = ", e)
      if (e !== 'No current user') {
        console.warn(e)
      }
      console.log('Redirect to log in page')
      this.props.history.push('/login')
    }
  }

  getNumberOfImagesForTraining = async () => {
    this.setState({              
      isRefreshingImageForTraining: true
    });

    try {
      const result = await API.get("api", "/trainingImages/");
      if (result.statusCode === 200){
        this.setState({
          numberofImagesForTraining: result.NoOfImages,
          isRefreshingImageForTraining: false
        });
      }
    } catch (e) {
      console.log(e);
      this.setState({        
        numberofImagesForTraining: '0',
        isRefreshingImageForTraining: false
      });
    } 
  }  

  
  analyzeCorrosion = async () => {
    this.setState({      
      analyzedFileUrl: null,
      isLoading: true
    });

    const base64Image = await getBase64(this.state.file);
    const params = {
      body: {
        img: base64Image,
        BatchId: "",
        BatchName: "",
        FileName: ""
      },
      headers: {
        "Content-Type": "application/json"
      }
    };
    try {
      const result = await API.put("api", "detect/", params);
      
      if (result.statusCode === 200) {        
      
        const analyzedFilename = result.analyzedImageKey;
        getS3Url(analyzedFilename).then(fileUrl => {
      
          this.setState({
            isLoading: false,
            analyzedFileUrl: fileUrl,
            percentages: result.percent,
            //downloadImage: result.downloadImageKey
          });
        });
      }
    } catch (e) {
      console.log(e);
      this.setState({
        isLoading: false,
        latestUploadedFileUrl: null,
        analyzedFileUrl: null,
        file: null
      });
    }
  };

  showModal = async () => {  
    this.setState({
      modalSelectedImageURL: this.state.latestUploadedFileUrl,      
      modalAnalyzedImageURL: this.state.analyzedFileUrl,
      modal: true,
      analysisDetailsLabel: this.state.percentages.p1 !== undefined ?  ` - Corrosion % =${Math.round(this.state.percentages.p1)}%` : ``
      
    });
  }
  showModal2 = async () => {  
    this.setState({      
      modalSelectedImageURL: this.state.latestUploadedFileUrl,      
      modalAnalyzedImageURL: this.state.analyzedFileUrl,
      modal: true,
      analysisDetailsLabel: this.state.percentages.p1 !== undefined ?  ` - Corrosion % =${Math.round(this.state.percentages.p1)}%` : ``
    });
  }

  
  hideModal = async () => {  
    this.setState({
      modalSelectedImageURL: "",
      modal: false
    });    
  }

  fileChanged = async(event) => {
    event.preventDefault();
    let reader = new FileReader();
    let file = event.target.files[0];
    

    reader.onloadend = () => {
      this.setState({
        file: file,
        latestUploadedFileUrl: reader.result,
        analyzedFileUrl: ''
      });
    }
    if (file != null)
      reader.readAsDataURL(file)    
  }

  fileForTrainingChanged= async(event) => {
    event.preventDefault();
    let reader = new FileReader();
    let file = event.target.files[0];   
    
    reader.onloadend = () => {
      this.setState({
        fileForTraining: file
      });
    }
    if (file != null)
      reader.readAsDataURL(file)    
  }

  uploadFileForTraining = async () => {
    this.setState({      
      isUploadingImageForTraining: true      
    });    
    try {
      await putDataForTraining(this.state.fileForTraining)      
    } catch (e) {
    console.log("e = ", e)    
  }
  finally{
    this.setState({      
      isUploadingImageForTraining: false
    });  
  }
}

refreshTrainingBatchList= async () => {
  this.setState({    
    isLoadingTrainingBatchList: true
  });
  try {

    // try refreshing the Number of Images Displayed
    this.getNumberOfImagesForTraining()

    const result = await API.get("api", `/trainingbatch/`);
    

    if (result.Count > 0) {    
      this.setState({
        trainingImageBatchList: result.Items,
        isLoadingTrainingBatchList: false
      });
    }
    else{
        this.setState({
          trainingImageBatchList: [],
          isLoadingTrainingBatchList: false
        });
    }
  } catch (e) {
    console.log(e);
    this.setState({
        trainingImageBatchList: [],
        isLoadingTrainingBatchList: false
    });
  }
}

toggle() {
  this.setState(prevState => ({
    modal: !prevState.modal
  }));
}

renderTab = (tabName) => {

  return (
    <Tab.Pane>
      {
        tabName === 'PickImage' && (
          this.renderImagePicker()
        )
      }
      {
        tabName === 'Realtime' && (
          this.renderRealtimeInference()
        )
      }
      
    </Tab.Pane>
    )
}

onTabChange = (ev, data) => {
  this.setState({
    isLoading: false,
    latestUploadedFileUrl: null,
    analyzedFileUrl: null,
    file: null
  });
}

setRef = webcam => {
  this.webcam = webcam    
}

capture = async() => {
  if (this.webcam !== null){

    this.setState({      
      analyzedFileUrl: null,
      isLoading: true
    });

    const imageSrc = this.webcam.getScreenshot()
    const base64Image = imageSrc.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
    const params = {
      body: {
        img: base64Image,
        BatchId: "",
        BatchName: "",
        FileName: ""
      },
      headers: {
        "Content-Type": "application/json"
      }
    };
    try {
      const result = await API.put("api", "detect/", params);
      
      if (result.statusCode === 200) {        
      
        const analyzedFilename = result.analyzedImageKey;
        getS3Url(analyzedFilename).then(fileUrl => {
      
          this.setState({
            isLoading: false,
            analyzedFileUrl: fileUrl,
            percentages: result.percent,
          });
        });
      }
    } catch (e) {
      console.log(e);
      this.setState({
        isLoading: false,
        latestUploadedFileUrl: null,
        analyzedFileUrl: null,
        file: null
      });
    }
  }
}

renderRealtimeInference(){

  const videoConstraints = {
    width : 1280,
    height : 900,
    facingMode : "user",
  }

  const { percentages, analyzedFileUrl, isLoading} = this.state;

  return (

    

    <div>
        <Grid columns={2} style={{width: "100%"}} textAlign='center' celled >
          <Grid.Row>
            <Grid.Column>
              <h5> Camera feed </h5>
            </Grid.Column>
            <Grid.Column>
              {analyzedFileUrl && (
                <h5> Analyzed Image  - Corrosion % ={Math.round(percentages.p1)}%</h5>
              )}
              {!analyzedFileUrl && (
                <h5> Analyzed Image </h5>
              )}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column style={{height: "550px", width: "50%", textAlign: "-webkit-center" }}>
              <Grid>
                <Grid.Row style={{"margin": "-40px"}}>
                <Grid.Column>
                  <Webcam
                    audio={false}
                    height={500}
                    ref={this.setRef}
                    screenshotFormat="image/jpeg"
                    width={600}
                    videoConstraints={videoConstraints}
                  />
                </Grid.Column>
                </Grid.Row>
                  <Grid.Row>
                    <Grid.Column>
                      <LoaderButton
                        text="Analyze corrosion"
                        isLoading={isLoading}
                        loadingText="Analyzing corrosion .."
                        onClick={this.capture.bind(this)}
                      />
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
            </Grid.Column>
            <Grid.Column style={{height: "550px", width: "50%", textAlign: "-webkit-center"}}>
              
              {analyzedFileUrl && (
              <img alt=""
                src={analyzedFileUrl}                    
                className="uploaded-image"
              />
              )} 
              {
                !analyzedFileUrl && !isLoading && (
                
                  <Card style={{"height": "525px", "width": "600px"}}>
                    <Card.Content>
                      <Placeholder style={{"height": "500px", "width": "600px"}}>
                        <Placeholder.Image square />
                      </Placeholder>
                      
                    </Card.Content>
                  </Card>
              
                )
              }
              
              {isLoading && 
                <Card>
                <Card.Content><br/><br/><br/><br/>
                  <Placeholder>
                  <Dimmer active inverted>
                  <Loader inverted size="huge">Analyzing ...</Loader>
                    </Dimmer>
                  </Placeholder>
                
                </Card.Content>
              </Card>
              }
              
            </Grid.Column>
          </Grid.Row>
        </Grid>
      
      </div>

    
  )
}

renderImagePicker(){
  const { percentages, file, analyzedFileUrl,
    latestUploadedFileUrl, isLoading } = this.state;
 

  return (
    <React.Fragment>
      <div>
      <p>Choose an image to perform corrosion analysis.(Max. image size is 5 MB)</p>
      <Row>
        <Col xs="4">
          <input
            type="file"
            accept="image/*"
            onChange={(event)=>this.fileChanged(event)}               
          />
        </Col>
        <Col>
        {file && (
          <LoaderButton
            text="Analyze corrosion"
            isLoading={isLoading}
            loadingText="Analyzing corrosion .."
            onClick={this.analyzeCorrosion}
          />
        )}
        {!file && (
          <LoaderButton
            text="Analyze corrosion"
            isLoading={isLoading}
            loadingText="Analyzing corrosion .."
            onClick={this.analyzeCorrosion}
            disabled={true}
          />
        )}
        </Col>
      </Row>
    </div>

  
    
      <div>
        <Grid columns={2} style={{width: "100%"}} textAlign='center' celled >
          <Grid.Row>
            <Grid.Column>
              <h5> Original Image </h5>
            </Grid.Column>
            <Grid.Column>
              {analyzedFileUrl && (
                <h5> Analyzed Image  - Corrosion % ={Math.round(percentages.p1)}%</h5>
              )}
              {!analyzedFileUrl && (
                <h5> Analyzed Image </h5>
              )}
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column style={{height: "400px", width: "50%", textAlign: "-webkit-center" }}>
              {latestUploadedFileUrl && (
              <img alt=""
                onClick={this.showModal2}
                src={latestUploadedFileUrl}                    
                className="uploaded-image"
              />
              )}
              {
                !latestUploadedFileUrl && (
                  <Card>
                    <Card.Content>
                      <Placeholder>
                        <Placeholder.Image square />
                      </Placeholder>
                    </Card.Content>
                  </Card>
                )
              }
            </Grid.Column>
            <Grid.Column style={{height: "400px", width: "50%", textAlign: "-webkit-center"}}>
              
              {analyzedFileUrl && (
              <img alt=""
                onClick={this.showModal}
                src={analyzedFileUrl}                    
                className="uploaded-image"
              />
              )} 
              {
                !analyzedFileUrl && !isLoading && (
                
                  <Card>
                    <Card.Content>
                      <Placeholder>
                        <Placeholder.Image square />
                      </Placeholder>
                      
                    </Card.Content>
                  </Card>
              
                )
              }
              
              {isLoading && 
                <Card>
                <Card.Content><br/><br/><br/><br/>
                  <Placeholder>
                  <Dimmer active inverted>
                  <Loader inverted size="huge">Analyzing ...</Loader>
                    </Dimmer>
                  </Placeholder>
                
                </Card.Content>
              </Card>
              }
              
            </Grid.Column>
          </Grid.Row>
        </Grid>
      
      </div>
  </React.Fragment>
  )
}


  render() {
    const { modalSelectedImageURL, modalAnalyzedImageURL } = this.state;
       
    

    const panes = [
      {
        menuItem: { key: 1, content: 'Pick Image', icon: (<Icon name='image' color='green'></Icon>) },
        render: () => this.renderTab('PickImage'),
      },
      {
        
        menuItem: { key: 2, content: 'Realtime', icon: (<Icon name='camera' color='orange'></Icon>) },
        render: () => this.renderTab('Realtime'),
      }
    ]
  
    return (
      <OneColumnLayout>

        <Header as='h3'>
            <Icon name='find' color="blue"/>
            <Header.Content>
              On-Demand analysis
            </Header.Content>
          </Header>
          <hr/>
          <Tab panes={panes} onTabChange={this.onTabChange.bind(this)}/>
          <div>
            <Modal centered={true} toggle={this.toggle} className="modal-90w" isOpen={this.state.modal} >
              
              <ModalBody>
                <Row>
                  <Col>
                    <p> Original Image </p>
                  </Col>
                  <Col>
                    <p> Analyzed Image {this.state.analysisDetailsLabel}</p>
                  </Col>
                </Row>
                <Row>
                  <Col>
                  {modalSelectedImageURL && (
                    <img alt=""
                      src={modalSelectedImageURL}  
                      className="original-size-image"                 
                    />
                  )}
                  </Col>
                  <Col>
                  {modalAnalyzedImageURL && (
                    <img alt=""
                      src={modalAnalyzedImageURL}  
                      className="original-size-image"                 
                    />
                  )}
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={this.hideModal}>Cancel</Button>
              </ModalFooter>
            </Modal>

          </div>

        
      </OneColumnLayout>
    );
  }
}
