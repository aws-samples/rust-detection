// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {Card, CardTitle, CardSubtitle, CardText, CardBody, CardImg } from 'reactstrap';
import './CardItem.scss';

export class CardItem extends Component {

  render() {
    const {children, title, subtitle, imageUrl, footer, onClick, className, ...rest} = this.props;

    let cardClassName = 'spd-carditem';

    if(onClick){
		  cardClassName += ' spd-carditem__clickable';
    }

    if(className){
      cardClassName += ` ${className}`;
    }

    return (
      <Card onClick={onClick} className={cardClassName} {...rest}>
      	{ imageUrl && <CardImg top width="100%" src={imageUrl} /> }
        <CardBody>

    			{ title && <CardTitle>{title}</CardTitle> }
    			{ subtitle && <CardSubtitle>{subtitle}</CardSubtitle> }
    			<CardText>{children}</CardText>


          {footer &&
		        <CardText>
		        	<small className="text-muted text-right">{footer}</small>
		        </CardText>
	        }
        </CardBody>

      </Card>
    );
  }

}

CardItem.propTypes = {
  title : PropTypes.string,
  subtitle : PropTypes.string,
  imageUrl : PropTypes.string,
  footer : PropTypes.string,
  onClick : PropTypes.func
};
