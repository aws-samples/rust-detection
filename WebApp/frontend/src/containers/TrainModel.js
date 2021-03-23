// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import "./Home.scss";
import { OneColumnLayout } from "../components/layouts/OneColumnLayout";
import { Button } from "../components/forms/Button";
import { downloadFile, getS3Url, s3Upload } from "../libs/awsLib";
import { LoaderButton } from "../components/forms/LoaderButton";
import BouncingLoader from "../components/BouncingLoader";
import { getBase64 } from "./convertToBase64";
import ImgsViewer from "react-images-viewer";
import { Row, Col } from "reactstrap";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { Alert } from 'reactstrap';

import { API } from "aws-amplify";

export default class TrainModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      latestUploadedFileUrl: "", // S3 URL of the Uploaded Image
      analyzedFileUrl: "", // URL for the Analyzed Image received from API
      isLoading: false,
      file: null,
      modal: false, 
      modalSelectedImageURL: "",  // URL of the Selected Image to be displayed on the Modal Window
      imageClickedLabel: "", // Label of Image clicked to be dispalyed on the Modal
      modifiedImageFileName: "" // NOT USED or REQD ?
    };
  }

  handleDownload= async () => {
    downloadFile(this.state.modifiedImageFileName).then(fileUrl => {
      console.log("fileUrl = ", fileUrl);      
    });

  }

  handleUpload = async () => {
    this.setState({      
      analyzedFileUrl: null,
      isLoading: true
    });

    const base64Image = await getBase64(this.state.file);
    const params = {
      body: {
        img: base64Image
      },
      headers: {
        "Content-Type": "application/json"
      }
    };
    try {
      const result = await API.put("api", "/detect/", params);
      
      if (result.statusCode === 200) {
        const filename = result.originalImageKey;
        getS3Url(filename).then(fileUrl => {
      
          this.setState({
            isLoading: false,
            latestUploadedFileUrl: fileUrl
          });
        });

        const analyzedFilename = result.analyzedImageKey;
        getS3Url(analyzedFilename).then(fileUrl => {
          
          this.setState({
            isLoading: false,
            analyzedFileUrl: fileUrl
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
      modalSelectedImageURL: this.state.analyzedFileUrl,      
      modal: true,
      imageClickedLabel: 'Analyzed Image'      
    });
  }
  showModal2 = async () => {  
    this.setState({      
      modalSelectedImageURL: this.state.latestUploadedFileUrl,
      modal: true,
      imageClickedLabel: 'Original Image'            
    });
  }

  //imageClickedLabel: source == 'O' ? "Original Image" : "Processed Image"
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
    reader.readAsDataURL(file)    
  }

  render() {
    const { file, modalSelectedImageURL, analyzedFileUrl, latestUploadedFileUrl, isLoading } = this.state;

    return (
      <OneColumnLayout>
        <Alert color="dark"><h3>Modal Training</h3></Alert>          
        
        <div>
          <p>Choose an image to perform corrosion analysis.</p>
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
                onClick={this.handleUpload}
              />
            )}
            {!file && (
              <LoaderButton
                text="Analyze corrosion"
                isLoading={isLoading}
                loadingText="Analyzing corrosion .."
                onClick={this.handleUpload}
                disabled={true}
              />
            )}
            </Col>
          </Row>

          <hr />
         
          
          <div>
            <Row>
              <Col>
                <Col>
                  <h5> Analyzed Image </h5>
                </Col> 
              </Col>
              <Col>
                <h5> Original Image </h5>
              </Col>
            </Row>
            
            <Row>              
              <Col>
              {isLoading && <BouncingLoader />}
              {analyzedFileUrl && (
                <img
                  onClick={this.showModal}
                  src={analyzedFileUrl}                    
                  className="uploaded-image"
                />
                )}
              </Col>              
            
              <Col>
              {latestUploadedFileUrl && (
                <img
                  onClick={this.showModal2}
                  src={latestUploadedFileUrl}                    
                  className="uploaded-image"
                />
                )}
              </Col>
            
            </Row>
            <hr />
          </div>
        

          <Modal centered={true} className="modal-90w" isOpen={this.state.modal} keyboard={true}>
            <ModalHeader>{this.state.imageClickedLabel}</ModalHeader>
            <ModalBody>
              {modalSelectedImageURL && (
                <img
                  src={modalSelectedImageURL}  
                  className="original-size-image"                 
                />
              )}
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
