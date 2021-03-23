// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import { Container } from "reactstrap";

import './OneColumnLayout.scss';
import { mergeClassName } from "../Utils";
export class OneColumnLayout extends Component {
  render() {
    const { children, className, ...rest } = this.props;
    return (
      <Container fluid={true} className={mergeClassName("layout--fullpage", className)} {...rest}>
        {children}
      </Container>
    );
  }
}


