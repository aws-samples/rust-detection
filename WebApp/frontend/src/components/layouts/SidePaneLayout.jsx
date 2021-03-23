// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from "prop-types";

import './SidePaneLayout.scss';
import { mergeClassName } from "../Utils";
export class SidePaneLayout extends Component {
  render() {
    const {className, ...rest} = this.props;
    return (
      <div className={mergeClassName("layout--sidepane", className)} {...rest}>
        {this.props.children}
      </div>
    );
  }
}

export class SidePane extends Component {
  render() {
    const {className, ...rest} = this.props;
    return (
      <div className={mergeClassName("sidepane", className)} {...rest}>
        {this.props.children}
      </div>
    )
  }
}

SidePane.propTypes = {
  width : PropTypes.number
};


export class MainPane extends Component {
  render() {
    const {className, ...rest} = this.props;
    return (
      <div className={mergeClassName("mainpane", className)} {...rest}>
        {this.props.children}
      </div>
    )
  }
}
