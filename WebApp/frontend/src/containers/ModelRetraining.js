// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import "./Home.scss";
import "./ModelRetraining.scss";
import { OneColumnLayout } from "../components/layouts/OneColumnLayout";
import { LoaderButton } from "../components/forms/LoaderButton";
import { Row, Col } from "reactstrap";
import { Auth } from "aws-amplify";
import { API } from "aws-amplify";
import { Label, Input} from 'reactstrap';
import { FormGroup} from 'reactstrap';
import { UncontrolledTooltip,  } from 'reactstrap';
import { Table, Header } from 'semantic-ui-react'
import { Tab } from 'semantic-ui-react'
import { Icon } from "semantic-ui-react";
import 'semantic-ui-css/semantic.min.css'
import config from "../config";

const trainingParams1 = {
  "TrainingJobName":"Corrosion-Detection-JobName",
  "MaxRuntimeInSeconds":20000,
  "InstanceCount":1,
  "InstanceType":"ml.c5.2xlarge",
  "S3OutputPath":`s3://${config.ML_DATASET_BUCKET}/output`,
  "InputTrainingS3Uri":`s3://${config.ML_DATASET_BUCKET}/train.csv`,
  "InputValidationS3Uri":`s3://${config.ML_DATASET_BUCKET}/validation.csv`,
  "HyperParameters":{
     "max_depth":"3",
     "learning_rate":"0.12",
     "eta":"0.2",
     "colsample_bytree":"0.9",
     "gamma":"0.8",
     "n_estimators":"150",
     "min_child_weight":"10",
     "num_class":"2",
     "subsample":"0.8",
     "num_round":"100",
     "objective":"multi:softmax"
  },
"EndpointInstanceType":"ml.m5.xlarge",
"EndpointInitialInstanceCount":1
}

const endpointParams1 =  { "TrainingJobName": "", "InstanceType": "ml.m5.xlarge", "InitialInstanceCount": 1 }

export default class ModelRetraining extends Component {
  constructor(props) {
    super(props);

    this.state = {
      numberofImagesForTraining: "0",      
      trainingParams: JSON.stringify(trainingParams1, null, 4),
      endpointParams: JSON.stringify(endpointParams1, null ,4),
      trainingJobsList: [],
      endpointList: [],
      isLoadingtrainingJobsList: false,
      isLoadingendpointList: false,
      isPromoteEndpointLoading: false,
      currentEndpoint: "",
      previousEndpoint: "",
      newEndpointName: "",
      chkCreateEndpoint: true,
      isTrainingJobSubmitInProgress: false,
      isEndpointJobSubmitInProgress: false
    };
  }

  async componentDidMount() {
    try {
      await Auth.currentSession()
      
      this.trainingJobTimer = setInterval(()=> this.refreshTrainingJobs(), 5000);

      //Load Jobs, Endpoint Tables, currentSageMaker Endpoint being used,
      this.refreshEndpointList()
      this.refreshTrainingJobs()
      this.getCurrentEndpoint()
      this.getNumberOfImagesForTraining()

    } catch (e) {
      console.log("e = ", e)
      if (e !== 'No current user') {
        console.warn(e)
      }
      
      this.props.history.push('/login')
    }
  }

  componentWillUnmount() {
    this.trainingJobTimer = null;
  }

  
  getNumberOfImagesForTraining = async () => {
    try {
      const result = await API.get("api", "/trainingImages/");
      if (result.statusCode === 200){
        this.setState({
          numberofImagesForTraining: result.NoOfImages
        });
      }
    } catch (e) {
      console.log(e);
      this.setState({        
        numberofImagesForTraining: '0'
      });
    } 
  }  

  refreshTrainingJobs= async () => {    
    this.setState({      
      isLoadingtrainingJobsList: true
    });  
    try {
      const result = await API.get("api", "/trainingjob/");
      this.setState({
        trainingJobsList: result,
        isLoadingtrainingJobsList: false
      });  
    } catch (e) {
      console.log(e);
      this.setState({
        trainingJobsList: [],
        isLoadingtrainingJobsList: false
      });
    } 
  }

  refreshEndpointList = async () => {    
    this.setState({      
      isLoadingendpointList: true
    });  
    try {
      const result = await API.get("api", "/endpointList/");
      this.setState({
        endpointList: result,
        isLoadingendpointList: false
      });  
    } catch (e) {
      console.log(e);
      this.setState({
        endpointList: [],
        isLoadingendpointList: false
      });
    } 
  }

  
  handleOnChangeTrainingParams(event) {
    this.setState({
      trainingParams: event.target.value
    })
  }

  onEndpointNameChange(event) {
    this.setState({
      newEndpointName: event.target.value
    })
  }

  onCreateEndpointChecked(event) {
    this.setState({
      chkCreateEndpoint: !this.state.chkCreateEndpoint
    })    
    
  }

  handleOnChangeEndpointParams(event) {
    this.setState({
      endpointParams: event.target.value
    })
  }

  getCurrentEndpoint = async () => {
    try {
      const result = await API.get("api", "/Endpoint/");
      this.setState({
        currentEndpoint: result.CurrentEndpoint,
        previousEndpoint: result.PreviousEndpoint
      });  
    } catch (e) {
      console.log(e);
      this.setState({
        currentEndpoint: ""
      });
    }
  }

  promoteEndPoint = async () => {

    if (this.state.newEndpointName.trim() !== ''){
    
    this.setState({      
      isPromoteEndpointLoading: true
    });

    const params = {
      body: {
        'NewEndpoint': this.state.newEndpointName
      },
      headers: {
        "Content-Type": "application/json"
      }
    };

    try {
      const result = await API.put("api", "/Endpoint/", params);
      if (result.statusCode === 200) {      
        this.setState({
          previousEndpoint: this.state.currentEndpoint,
          currentEndpoint: this.state.newEndpointName,          
          newEndpointName: "",
          isPromoteEndpointLoading: false
        });  
      }
    } catch (e) {
      console.log(e);
      this.setState({
        isPromoteEndpointLoading: false
      });
    }
  }
  }

  handleSubmitTrainingJob = async () => {
    this.setState({
      isTrainingJobSubmitInProgress: true
    });
    
    const params = {
      body: JSON.parse(this.state.trainingParams),
      headers: {
        "Content-Type": "application/json"
      }
    };

    try {
      let result = 0
      if (this.state.chkCreateEndpoint)
        result = await API.post("api", "ModelAndEndpoint/", params);
      else
        result = await API.post("api", "/Model/", params);

      if (result.statusCode === 200) {      
        console.log('Submitted Training Job successfuly')
      }
      this.setState({
        isTrainingJobSubmitInProgress: false
      });
    } catch (e) {
      console.log(e);
      this.setState({
        isTrainingJobSubmitInProgress: false        
      });
    }
  };


  handleCreateEndpoint = async () => {
    this.setState({
      isEndpointJobSubmitInProgress: true
    });

    const params = {
      body: JSON.parse(this.state.endpointParams),      
      headers: {
        "Content-Type": "application/json"
      }
    };

    try {           
      const result = API.post("api", "/Endpoint/", params);
      
      if (result.statusCode === 200) {      
        console.log('Submitted Endpoint Job successfuly')
      }
      this.setState({
        isEndpointJobSubmitInProgress: false
      });
    } catch (e) {
      console.log(e);
      this.setState({
        isEndpointJobSubmitInProgress: false        
      });
    }
  };

  renderTrainingJobs() {
    return (
      <div>
          
          <Row>
            <Col xs="5">            
              <Row>
              <Col>
                <Label><b>Sagemaker Training Parameters</b></Label>              
              </Col> 
              
              </Row>
              <Row>
              <Col>
                <Input type="textarea"                 
                  value={this.state.trainingParams  } rows={23}
                  onChange={(event) => this.handleOnChangeTrainingParams(event)}/>
                </Col>
              </Row>
            </Col>
            <Col xs="7"><br></br>

            <Table celled striped>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell style={{width: '65%'}}>Job Name</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '20%'}}>Creation Time</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '15%'}}>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
              {
                  this.state.trainingJobsList.map((dataRow) => {
                    return <Table.Row key={dataRow.JobName}>
                      <Table.Cell style={{width: '65%'}}> {dataRow.JobName} </Table.Cell>
                      <Table.Cell style={{width: '20%'}}> {dataRow.CreationTime} </Table.Cell>
                      <Table.Cell style={{width: '15%'}}> 
                      {
                        dataRow.Status === "Completed" && 
                        <React.Fragment> Completed <Icon name="check circle outline" color="green"/></React.Fragment>
                      } 
                      {
                        dataRow.Status === "Failed" &&
                        <React.Fragment>Failed <Icon name="delete" color="red"/></React.Fragment>
                      }
                      {
                        dataRow.Status === "Stopped" &&
                        <React.Fragment>Stopped <Icon name="minus circle" color="grey"/></React.Fragment>
                      }
                      {
                        (dataRow.Status === "Starting" || dataRow.Status === "Training" || dataRow.Status === "Uploading" || dataRow.Status === "InProgress") &&
                        <React.Fragment> {dataRow.Status} <Icon name="cogs" color="orange"/></React.Fragment>
                      }
                      </Table.Cell>
                    </Table.Row>
                  })
                }
              </Table.Body>
            </Table>
            
            
            </Col>
          </Row>
                
          <Row>
            <Col xs="3"><br/>
              <FormGroup check>
                <Label check>
                  <Input type="checkbox" checked={this.state.chkCreateEndpoint} onChange={event => this.onCreateEndpointChecked(event)}/>
                  <span style={{color:"blue"}} href="#" id="CreateEndpointTooltip">Create Endpoint ?</span>
                </Label>
                <UncontrolledTooltip placement="right" target="CreateEndpointTooltip">
                  Selecting this option and submitting the training job will create and deploy
                  a new model on a new Sagemaker endpoint. 
                </UncontrolledTooltip>
              </FormGroup>
            </Col>
            
          </Row>
          <Row>
            <Col xs="3"><br/>
              <LoaderButton
                text="Submit Training Job"
                isLoading={this.state.isTrainingJobSubmitInProgress}
                loadingText="Submitting Job ..."
                onClick={this.handleSubmitTrainingJob}
              />
            </Col>
          </Row>
        </div>  
      
    )
  }

  renderEndpoints() {
    return (
      <div>
        
          <Row>
            <Col xs="5">            
              <Row>
                <Col>
                  <Label><b>Sagemaker Endpoint Parameters</b></Label>              
                </Col> 
              </Row>
              <Row>
                <Col>
                  <Input type="textarea"                 
                  value={this.state.endpointParams} rows={10}
                  onChange={(event) => this.handleOnChangeEndpointParams(event)}/>
                </Col>
              </Row>
              <Row>
                <Col>
                  <br/><LoaderButton
                    text="Create Endpoint"
                    isLoading={this.state.isEndpointJobSubmitInProgress}
                    loadingText="Creating Endpoint ..."
                    onClick={this.handleCreateEndpoint}
                  />
                </Col> 
              </Row>
            </Col>

            <Col xs="7"><br></br>
            
            <Table celled striped>
              {/* <tr style={{'text-align': 'right'}}>
                Displaying latest 10
                <LoaderButton text="Refresh" loadingText="Fetching Endpoints ..." isLoading={isLoadingendpointList} onClick={this.refreshEndpointList} />
              </tr>  */} 
              <thead>
                <tr>                  
                  <th style={{width: '60%'}}>Endpoint Name</th>
                  <th style={{width: '25%'}}>Creation Time</th>                  
                  <th style={{width: '15%'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {
                  this.state.endpointList.map((dataRow) => {
                    return <tr key={dataRow.EndpointName} >
                      <td style={{width: '60%'}}> {dataRow.EndpointName} </td>
                      <td style={{width: '25%'}}> {dataRow.CreationTime} </td>
                      <td style={{width: '15%'}}> 
                      {
                        dataRow.Status === "InService" && 
                        <React.Fragment> InService <Icon name="check circle outline" color="green"/></React.Fragment>
                      }
                      {
                        dataRow.Status === "OutOfService" && 
                        <React.Fragment> OutOfService <Icon name="delete" color="red"/></React.Fragment>
                      } 
                      {
                        dataRow.Status === "Failed" && 
                        <React.Fragment> Failed <Icon name="delete" color="red"/></React.Fragment>
                      } 
                      {
                        (dataRow.Status === "Creating" || dataRow.Status === "Updating" || dataRow.Status === "SystemUpdating" || dataRow.Status === "RollingBack" || dataRow.Status === "Deleting") && 
                        <React.Fragment> {dataRow.Status} <Icon name="cogs" color="grey"/></React.Fragment>
                      }
                      </td>
                    </tr>
                  })
                }
              </tbody>
            </Table>
            </Col>
          </Row>
        

          
        <br></br>
        </div>
    )
  }

  renderConfigureEndpoints(){
    return (
      
          <Table>
              <tr>
                <td>
                  <Label>Current Endpoint</Label>
                </td>
                <td>
                  <Label>{this.state.currentEndpoint}</Label>
                </td>
              </tr>
              <tr>
                <td>
                  <Label>Previous Endpoint</Label>
                </td>
                <td>
                  <Label>{this.state.previousEndpoint}</Label>
                </td>
              </tr>
              <tr>
                <td>
                  <Label>New Endpoint</Label>
                </td>
                <td>
                <Input type="text" placeholder="Enter new Sagemaker Endpoint" value={this.state.newEndpointName} onChange={event => this.onEndpointNameChange(event)}/>
                </td>
                <td>
                    <LoaderButton
                    text="Promote Endpoint"
                    isLoading={this.state.isPromoteEndpointLoading}
                    loadingText="Promoting Endpoint ..."
                    onClick={this.promoteEndPoint}
                  />
                </td>
                
              </tr>
            </Table>
    )
  }

  onTabChange = async (event, data) => {
    
    const currentCategory = data.panes[data.activeIndex].menuItem.content
    
    if (currentCategory === 'Sagemaker Training Jobs'){
      this.trainingJobTimer = setInterval(()=> this.refreshTrainingJobs(), 5000);
      clearInterval(this.trainingEndpointTimer)
      
    }
    else if (currentCategory === 'Sagemaker Endpoints'){
      this.trainingEndpointTimer = setInterval(()=> this.refreshEndpointList(), 5000);
      clearInterval(this.trainingJobTimer)
      
    }
    else{
      clearInterval(this.trainingEndpointTimer)
      clearInterval(this.trainingJobTimer)
    }
  } 

  renderTab = (tabName) => {

    return (
      <Tab.Pane>
        {
          tabName === 'Training' && (
            this.renderTrainingJobs()
          )
        }
        {
          tabName === 'Endpoint' && (
            this.renderEndpoints()
          )
        }
        {
          tabName === 'CEndpoint' && (
            this.renderConfigureEndpoints()
          )
        }
      </Tab.Pane>
      )
  }
  

  render() {

    const panes = [
      {
        menuItem: { key: 1, content: 'Sagemaker Training Jobs', icon: (<Icon name='th' color='blue'></Icon>) },
        render: () => this.renderTab('Training'),
      },
      {
        
        menuItem: { key: 2, content: 'Sagemaker Endpoints', icon: (<Icon name='th' color='orange'></Icon>) },
        render: () => this.renderTab('Endpoint'),
      },
      {
        
        menuItem: { key: 3, content: 'Configure Endpoint', icon: (<Icon name='configure' color='green'></Icon>) },
        render: () => this.renderTab('CEndpoint'),
      }
    ]


    return (
      <OneColumnLayout>
        <Header as='h3'>
            <Icon name='microchip' color="brown"/>
            <Header.Content>
            Machine learning model - Training and configuration
            </Header.Content>
          </Header>
        <hr/>
        <Tab panes={panes} onTabChange={this.onTabChange}/>
      </OneColumnLayout>
    );
  }
}
