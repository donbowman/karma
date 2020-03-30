import React, { Component } from "react";
import PropTypes from "prop-types";

import { observable, action } from "mobx";
import { observer } from "mobx-react";

import debounce from "lodash/debounce";

import MasonryInfiniteScroller from "react-masonry-infinite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp } from "@fortawesome/free-solid-svg-icons/faChevronUp";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";
import { SilenceFormStore } from "Stores/SilenceFormStore";
import { APIGrid } from "Models/API";
import { FilteringLabel } from "Components/Labels/FilteringLabel";
import { FilteringCounterBadge } from "Components/Labels/FilteringCounterBadge";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { AlertGroup } from "./AlertGroup";

const Grid = observer(
  class Grid extends Component {
    static propTypes = {
      alertStore: PropTypes.instanceOf(AlertStore).isRequired,
      settingsStore: PropTypes.instanceOf(Settings).isRequired,
      silenceFormStore: PropTypes.instanceOf(SilenceFormStore).isRequired,
      gridSizesConfig: PropTypes.array.isRequired,
      groupWidth: PropTypes.number.isRequired,
      grid: APIGrid.isRequired,
    };

    // store reference to generated masonry component so we can call it
    // to repack the grid after any component was re-rendered, which could
    // alter its size breaking grid layout
    masonryComponentReference = observable(
      { ref: false },
      {},
      { name: "Masonry reference" }
    );
    // store it for later
    storeMasonryRef = action((ref) => {
      this.masonryComponentReference.ref = ref;
    });
    // used to call forcePack() which will repack all grid elements
    // (alert groups), this needs to be called if any group size changes
    masonryRepack = debounce(
      action(() => {
        if (this.masonryComponentReference.ref) {
          this.masonryComponentReference.ref.forcePack();
        }
      }),
      10
    );

    initial = 50;
    groupsToRender = observable(
      {
        value: this.initial,
        setValue(value) {
          this.value = value;
        },
      },
      {
        setValue: action.bound,
      },
      { name: "Groups to render" }
    );
    // how many groups add to render count when user scrolls to the bottom
    loadMoreStep = 30;

    loadMore = action(() => {
      const { grid } = this.props;

      this.groupsToRender.value = Math.min(
        this.groupsToRender.value + this.loadMoreStep,
        grid.alertGroups.length
      );
    });

    gridToggle = observable(
      {
        show: true,
        toggle() {
          this.show = !this.show;
        },
      },
      {
        toggle: action.bound,
      }
    );

    componentDidUpdate() {
      const { grid } = this.props;

      this.masonryRepack();

      if (this.groupsToRender.value > grid.alertGroups.length) {
        this.groupsToRender.setValue(
          Math.max(this.initial, grid.alertGroups.length)
        );
      }
    }

    render() {
      const {
        alertStore,
        settingsStore,
        silenceFormStore,
        gridSizesConfig,
        groupWidth,
        grid,
      } = this.props;

      return (
        <React.Fragment>
          {alertStore.data.grids.length > 1 && (
            <h5 className="d-flex flex-row justify-content-between px-2 py-1 mx-0 mt-2 mb-0 bg-light">
              {grid.alertGroups.length > 1 && (
                <span className="flex-shrink-0 flex-grow-0 ml-0 mr-2">
                  <FilteringCounterBadge
                    name="@state"
                    value="unprocessed"
                    counter={grid.stateCount.unprocessed}
                    themed={true}
                    alertStore={alertStore}
                  />
                  <FilteringCounterBadge
                    name="@state"
                    value="suppressed"
                    counter={grid.stateCount.suppressed}
                    themed={true}
                    alertStore={alertStore}
                  />
                  <FilteringCounterBadge
                    name="@state"
                    value="active"
                    counter={grid.stateCount.active}
                    themed={true}
                    alertStore={alertStore}
                  />
                </span>
              )}
              <span
                className="flex-shrink-1 flex-grow-1 text-center"
                style={{ minWidth: "0px" }}
              >
                {grid.labelName !== "" && grid.labelValue !== "" && (
                  <FilteringLabel
                    key={grid.labelValue}
                    name={grid.labelName}
                    value={grid.labelValue}
                    alertStore={alertStore}
                  />
                )}
              </span>
              <span
                className="flex-shrink-0 flex-grow-0 text-white cursor-pointer badge px-0 components-label ml-2 mr-0"
                onClick={this.gridToggle.toggle}
              >
                <TooltipWrapper title="Click to toggle this grid details">
                  <FontAwesomeIcon
                    icon={this.gridToggle.show ? faChevronDown : faChevronUp}
                  />
                </TooltipWrapper>
              </span>
            </h5>
          )}
          <MasonryInfiniteScroller
            key={settingsStore.gridConfig.config.groupWidth}
            ref={this.storeMasonryRef}
            position={false}
            pack={true}
            sizes={gridSizesConfig}
            loadMore={this.loadMore}
            hasMore={false}
          >
            {this.gridToggle.show
              ? grid.alertGroups
                  .slice(0, this.groupsToRender.value)
                  .map((group) => (
                    <AlertGroup
                      key={group.id}
                      group={group}
                      showAlertmanagers={
                        Object.keys(alertStore.data.upstreams.clusters).length >
                        1
                      }
                      afterUpdate={this.masonryRepack}
                      alertStore={alertStore}
                      settingsStore={settingsStore}
                      silenceFormStore={silenceFormStore}
                      style={{
                        width: groupWidth,
                      }}
                    />
                  ))
              : []}
          </MasonryInfiniteScroller>
          {grid.alertGroups.length > this.groupsToRender.value && (
            <div className="d-flex flex-row justify-content-between">
              <span className="flex-shrink-1 flex-grow-1 text-center">
                <button
                  type="button"
                  className="btn btn-secondary mb-3"
                  onClick={this.loadMore}
                >
                  <FontAwesomeIcon className="mr-2" icon={faAngleDoubleDown} />
                  Load more
                </button>
              </span>
            </div>
          )}
        </React.Fragment>
      );
    }
  }
);

export { Grid };
