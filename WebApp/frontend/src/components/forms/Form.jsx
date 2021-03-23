// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import { Form as ReactStrapForm} from "reactstrap";

export class Form extends Component {
  render() {
    const {children, ...rest} = this.props;
    return (
      <ReactStrapForm {...rest}>
        {children}
      </ReactStrapForm>
    );
  }
}

Form.propTypes = {
};
