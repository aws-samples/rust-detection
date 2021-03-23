// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import "./Home.scss";
import "./BatchUpload.scss";
import { OneColumnLayout } from "../components/layouts/OneColumnLayout";

import { getS3Url, putDataForInference } from "../libs/awsLib";
import { LoaderButton } from "../components/forms/LoaderButton";
import { Row, Col } from "reactstrap";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";

import { Auth } from "aws-amplify";
import { API } from "aws-amplify";

import { v1 as uuidv1 } from 'uuid';
import { Header, Icon, Segment, Table, Button } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'


export default class BatchUpload extends Component {
  constructor(props) {
    super(props);

    this.state = {      
      isUpLoading: false,    
      batchInfo: [],
      batchDetailsInfo: [],
      currentBatchIdSelected: "",
      modalSelectedImageURL: "",
      modalAnalyzedImageURL: "",
      modal: false,
      fileForBatchAnalysis: "",
      isUploadingImageForBatchAnalysis: "",
      batchName: "",
      isLoadingBatchList: false,
      imageClickedLabel: ""
    };

    this.toggle = this.toggle.bind(this);
  }

  async componentDidMount() {
    try {
      await Auth.currentSession()
      this.refreshBatchInfo()
    } catch (e) {
      
      if (e !== 'No current user') {
        console.warn(e)
      }
      
      this.props.history.push('/login')
    }
  }

  displayBatchInfo = async() => {
    
    try {
      const result = await API.get("api", `/batch`);
      

      if (result.Count > 0) {    
        this.setState({
          batchInfo: result.Items
        });
      }
      else{
          this.setState({
            batchInfo: []
          });
      }
    } catch (e) {
      
      this.setState({
        batchInfo: []
      });
    }
  }

  refreshBatchInfo = async() => {
    this.setState({
      isLoadingBatchList: true
    });
    
    await this.displayBatchInfo()

    this.setState({
      isLoadingBatchList: false
    });
  }

  
 onBatchIdClicked(batchId) {    
  
  this.setState({
    currentBatchIdSelected: batchId
  });
  this.displayBatchDetails(batchId)
}
  
  displayBatchDetails = async(id) => {
    

    this.setState({
      batchDetailsInfo: []
    });

    try {
      const result = await API.get("api", `/batch/${id}`);
      

      if (result.Count > 0) {

          let tempItems = []        
          result.Items.forEach(item => {            
         
          let tempItem = {}
          tempItem["Endpoint"] = item["Endpoint"]
          tempItem["Percent"] = item["Percent"]
          tempItem["BatchId"] = item["BatchId"]
          tempItem["Status"] = item["Status"]
          
          getS3Url(item["OriginalImage"]).then(fileUrl => {
            tempItem["OriginalImage"] = fileUrl
            this.setState({
              batchDetailsInfo: tempItems
            });
          });

          getS3Url(item["AnalyzedImage"]).then(fileUrl1 => {
            tempItem["AnalyzedImage"] = fileUrl1
            this.setState({
              batchDetailsInfo: tempItems
            });
          });
          
          tempItems.push(tempItem)
        })

        
        this.setState({
          batchDetailsInfo: tempItems
        });
        
      }
    } catch (e) {
      console.log(e);
      this.setState({
        batchDetailsInfo: []
      });
    }    
  }

  showAnalyzedModal = async (url, label, originalImageUrl) => {  
    this.setState({
      modalSelectedImageURL: originalImageUrl,      
      imageClickedLabel: `Analyzed Image - ${label}`,
      modal: true,
      modalAnalyzedImageURL: url

    });
  }

  showModal = async (url, analyzedUrl, label) => {  
    this.setState({
      modalSelectedImageURL: url,
      //imageClickedLabel: "Original Image",
      imageClickedLabel: `Analyzed Image - ${label}`,
      modal: true,
      modalAnalyzedImageURL: analyzedUrl
    });
  }

  hideModal = async () => {  
    this.setState({
      modalSelectedImageURL: "",
      modal: false
    });    
  }

  handleUpload = async () => {
    this.setState({      
      isUploadingImageForBatchAnalysis: true      
    });    
    try {
      await putDataForInference(this.state.fileForBatchAnalysis)      
    } catch (e) {
    console.log("e = ", e)    
  }
  finally{
    this.setState({      
      isUploadingImageForBatchAnalysis: false
    });  
  }
}

fileChanged = async(event) => {
  event.preventDefault();
  let reader = new FileReader();
  let file = event.target.files[0];
  

  reader.onloadend = () => {
    this.setState({
      fileForBatchAnalysis: file
    });
  }
  if (file != null)
    reader.readAsDataURL(file)    
}

toggle() {
  this.setState(prevState => ({
    modal: !prevState.modal
  }));
}

  render() {
    const { isUploadingImageForBatchAnalysis, currentBatchIdSelected,
       modalSelectedImageURL, fileForBatchAnalysis, modalAnalyzedImageURL} = this.state;

    return (
      <OneColumnLayout>
          <Header as='h3'>
            <Icon name='th' color="blue"/>
              <Header.Content>
                Batch Analysis
              </Header.Content>
          </Header>
          <hr/>
        
        
          <p>Choose a zip file with Images. File name should contain a Batch name and be in the format <i>filename_BatchName.zip</i> (Max 25 Images per Zip file. Max Image size 5 MB)</p>
          <Row>
            <Col xs="4">
              <input
                type="file"
                accept="*"
                onChange={(event)=>this.fileChanged(event)}
              />
            </Col>            
            <Col>
            {fileForBatchAnalysis && (
              <LoaderButton
                  text="Upload"
                  isLoading={isUploadingImageForBatchAnalysis}
                  loadingText="Uploading ..."
                  onClick={this.handleUpload}
                />   
              )}  
              {!fileForBatchAnalysis && (
              <LoaderButton
                  text="Upload"
                  isLoading={isUploadingImageForBatchAnalysis}
                  loadingText="Uploading ..."
                  onClick={this.handleUpload}
                  disabled={true}
                />   
              )}               
              </Col>
          </Row>

          
          <Segment>
            <b>Batch Information &nbsp; </b> 
            {/* <LoaderButton text="Refresh" loadingText="Fetching Batch Info ..." isLoading={isLoadingBatchList} /> */}
            <Button icon onClick={this.refreshBatchInfo} color='blue'>
              <Icon name='refresh' />
            </Button>
            

            <Table celled striped>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell style={{width: '30%'}}>Batch Id</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '40%'}}>Batch Name</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '20%'}}>Created Time</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '20%'}}>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {
                  this.state.batchInfo.map((dataRow) => {
                    return <tr key={dataRow.BatchId} style={{cursor:'pointer'}} onClick={event => this.onBatchIdClicked(dataRow.BatchId)}>
                      <Table.Cell  style={{width: '30%'}} > {dataRow.BatchId} </Table.Cell>
                      <Table.Cell style={{width: '40%'}}> {dataRow.BatchName} </Table.Cell>
                      <Table.Cell style={{width: '20%'}}> {dataRow.CTime} </Table.Cell>
                      <Table.Cell style={{width: '10%'}}> {dataRow.batchStatus} </Table.Cell>
                    </tr>
                  })
                }
              </Table.Body>
            </Table>

          <p><b>Images Analyzed for Batch </b>- <i> {currentBatchIdSelected} </i></p>

          <div>
          <Table celled striped >
              <Table.Header>
                <Table.Row>        
                  <Table.HeaderCell style={{width: '15%'}}>Analyzed Image</Table.HeaderCell>                  
                  <Table.HeaderCell style={{width: '15%'}}>Original Image</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '20%'}}>Corrosion Percentage</Table.HeaderCell>
                  <Table.HeaderCell style={{width: '40%'}}>Sagemaker Endpoint Used</Table.HeaderCell>
                  {/* <Table.HeaderCell style={{width: '10%'}}>Status</Table.HeaderCell> */}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {
                  this.state.batchDetailsInfo.map((dataRow) => {
                    return <Table.Row key={uuidv1()} >
                      <Table.Cell style={{width: '15%'}}> <img className="uploaded-image" alt="" onClick={() => this.showAnalyzedModal(dataRow.AnalyzedImage, dataRow.Percent, dataRow.OriginalImage)} style={{width: '100px', height: '70px'}} src={dataRow.AnalyzedImage}></img></Table.Cell>
                      <Table.Cell style={{width: '15%'}}> <img className="uploaded-image" alt="" onClick={() => this.showModal(dataRow.OriginalImage, dataRow.AnalyzedImage, dataRow.Percent)} style={{width: '100px', height: '70px'}} src={dataRow.OriginalImage}></img></Table.Cell>
                      <Table.Cell style={{width: '20%'}}> {dataRow.Percent} </Table.Cell>
                      <Table.Cell style={{width: '40%'}}> {dataRow.Endpoint} </Table.Cell>
                      {/* <Table.Cell style={{width: '10%'}}>{dataRow.Status} </Table.Cell> */}
                    </Table.Row>
                  })
                }
              </Table.Body>
          </Table>
          </div>

          </Segment>

          <Modal centered={true} toggle={this.toggle}   isOpen={this.state.modal} className="modal-90w" >
              <ModalHeader>{this.state.imageClickedLabel}</ModalHeader>
              <ModalBody>
                <Row>
                  <Col>
                    <p> Original Image </p>
                  </Col>
                  <Col>
                    <p> Analyzed Image </p>
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

        
      </OneColumnLayout>
    );
  }
}
