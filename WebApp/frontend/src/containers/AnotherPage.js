// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from "react";

import { OneColumnLayout } from '../components';

export default class AnotherPage extends Component {

  render() {
    return <OneColumnLayout>
      <div className="another-page">
        <h3>Only logged in user can access this page. This is changed content.</h3>
        <p>
          {/* You can access the property passed from App.js. Search for childProps there */}
          The username = {this.props.authenticatedUserName}
        </p>
      </div>
    </OneColumnLayout>;
  }
}
