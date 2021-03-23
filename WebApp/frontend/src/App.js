// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Auth } from "aws-amplify";

// Instead of using Bootstrap with
// `import 'bootstrap/dist/css/bootstrap.min.css';`
// We use the customized Bootstrap css. See  comments in "src/custom-bootstrap/scss/custom.scss" for details.
import './custom-bootstrap/css/custom.css'
import 'open-iconic/font/css/open-iconic-bootstrap.css';

import config from "./config";

import { DemoContainer } from './components/layouts/DemoContainer';
import { Header } from "./components/Header";


import "./App.scss";
import Routes from "./Routes";


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isAuthenticated : false,
      authenticatedUserName : '',
    };
  }

  async componentDidMount() {
    try {
      const session = await Auth.currentSession();
      if (session) {
        this.userHasAuthenticated(session.accessToken.payload.username);
      }
    } catch (e) {
      if (e !== 'No current user') {
        console.warn(e);
      }
    }
  }

  userHasAuthenticated = username => {
    const isAuthenticated = !!username;

    this.setState({
      isAuthenticated : isAuthenticated,
      authenticatedUserName : username
    });
  };


  handleLogout = async () => {
    await Auth.signOut();

    this.userHasAuthenticated(false);

    this.props.history.push("/login");
  };

  handleModelReTraining = async () => {    
    this.props.history.push("/ModelReTraining");
  };

  handleGoHome = async () => {    
    this.props.history.push("/");
  };

  handleBatchUpload = async () => {    
    this.props.history.push("/BatchUpload");
  };

  render() {
    const childProps = {
      isAuthenticated : this.state.isAuthenticated,
      userHasAuthenticated : this.userHasAuthenticated,
      authenticatedUserName : this.state.authenticatedUserName,
    };


    return (
      <DemoContainer bgType='light'>
        <Header loginName={this.state.authenticatedUserName || ''}
                customerName={config.HEADER_TITLE}
                customerLogoUrl={config.HEADER_LOGO}
                onLogout={this.handleLogout}
                onMLTraining={this.handleModelReTraining}
                onHome={this.handleGoHome}
                onBatchUpload={this.handleBatchUpload}

        />
        <Routes childProps={childProps}/>
        
      </DemoContainer>
    );
  }

}

export default withRouter(App);
