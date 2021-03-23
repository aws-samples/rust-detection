// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  Carousel as ReactstrapCarousel, CarouselCaption, CarouselControl, CarouselIndicators, CarouselItem,
} from "reactstrap";

import './Carousel.scss';
import { getImageResource } from "./Utils";

export class Carousel extends Component {

  constructor(props) {
    super(props);
    this.state = {activeIndex : 0};
    this.next = this.next.bind(this);
    this.previous = this.previous.bind(this);
    this.goToIndex = this.goToIndex.bind(this);
    this.onExiting = this.onExiting.bind(this);
    this.onExited = this.onExited.bind(this);
  }

  onExiting() {
    this.animating = true;
  }

  onExited() {
    this.animating = false;
  }

  next() {
    const {items} = this.props;
    if (this.animating) return;
    const nextIndex = this.state.activeIndex === items.length - 1 ? 0 : this.state.activeIndex + 1;
    this.setState({activeIndex : nextIndex});
  }

  previous() {
    const {items} = this.props;
    if (this.animating) return;
    const nextIndex = this.state.activeIndex === 0 ? items.length - 1 : this.state.activeIndex - 1;
    this.setState({activeIndex : nextIndex});
  }

  goToIndex(newIndex) {
    if (this.animating) return;
    this.setState({activeIndex : newIndex});
  }

  render() {
    const {items} = this.props;
    const {activeIndex} = this.state;

    const slides = items.map((item, index) => {

      return (
        <CarouselItem
          onExiting={this.onExiting}
          onExited={this.onExited}
          key={`carousel-item-${index}`}
          className={item.className}
        >
          <img src={getImageResource(item.src)} alt={item.altText}/>
          <CarouselCaption captionText={item.caption} captionHeader={item.header}/>
        </CarouselItem>
      );
    });

    return (
      <div className="spd-carousel">
        <ReactstrapCarousel
          activeIndex={activeIndex}
          next={this.next}
          previous={this.previous}
        >
          <CarouselIndicators items={items} activeIndex={activeIndex} onClickHandler={this.goToIndex}/>
          {slides}
          <CarouselControl direction="prev" directionText="Previous" onClickHandler={this.previous}/>
          <CarouselControl direction="next" directionText="Next" onClickHandler={this.next}/>
        </ReactstrapCarousel>
      </div>
    );
  }
}

Carousel.propTypes = {
  items : PropTypes.array
};

Carousel.defaultProps = {
  items : []
};

