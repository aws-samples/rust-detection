// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './DemoContainer.scss';
import { mergeClassName } from "../Utils";

export class DemoContainer extends Component {

  render() {
  	const {bgType, className, ...rest} = this.props;

  	let containerClass = 'demo-container';
  	if(bgType && bgType !== 'none'){
  		containerClass += ` demo-container__${bgType}bg`;
  	}

    return (
      <div className={mergeClassName(containerClass, className)} {...rest}>
      	{this.props.children}
      </div>
    );
  }
}

DemoContainer.propTypes = {
	bgType: PropTypes.oneOf(['none', 'light'])
}


