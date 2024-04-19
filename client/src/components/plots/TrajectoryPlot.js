import Plot from 'react-plotly.js';
import {OrbitProgress} from "react-loading-indicators";
import {useEffect, useMemo, useRef, useState} from "react";
import {useResizeDetector} from 'react-resize-detector';
import {plotStyles, trajectoryColor} from "../../styles";
import {
    enforcePlotRange,
    enforceSameScaleHorizontal,
    enforceSameScaleVertical, getTolerancesPreservingAspectRatio,
} from "./plot-utils";
import {accelerationArrow, normalAccelerationArrow, speedArrow, tangentialAccelerationArrow} from "./arrows";
import {useDriverContext} from "../../context/DriverContext";
import {useVectorsContext} from "../../context/VectorsContext";

export default function TrajectoryPlot({className, trajectoryData, hoveredPoint, setHoveredPoint}) {
    const {currentDriver} = useDriverContext();
    const {vectors, getVectorsFromTime} = useVectorsContext();

    const {width, height, ref} = useResizeDetector();

    const minX = useMemo(() => trajectoryData ? Math.min(...(trajectoryData.map(it => it.x / 10))) : null, [trajectoryData]);
    const minY = useMemo(() => trajectoryData ? Math.min(...(trajectoryData.map(it => it.y / 10))) : null, [trajectoryData]);
    const maxX = useMemo(() => trajectoryData ? Math.max(...(trajectoryData.map(it => it.x / 10))) : null, [trajectoryData]);
    const maxY = useMemo(() => trajectoryData ? Math.max(...(trajectoryData.map(it => it.y / 10))) : null, [trajectoryData]);

    const [xTolerance, yTolerance] = getTolerancesPreservingAspectRatio(minX,maxX,minY,maxY, width, height,0.05, 0.05)

    const previousSize = useRef({width: 0, height: 0});

    const [range, setRange] = useState({
        x0: minX,
        x1: maxX,
        y0: minY,
        y1: maxY
    });

    useEffect(() => {
        let newRange;
        if (width !== previousSize.width) {
            newRange = enforceSameScaleHorizontal(width, height, range, minX, minY, maxX, maxY, xTolerance, yTolerance)
        }
        else if (height !== previousSize.height){
            newRange = enforceSameScaleVertical(width, height, range, minX, minY, maxX, maxY, xTolerance, yTolerance)
        }
        if(newRange !== undefined) {
            setRange(newRange)
        }
        previousSize.current = {width, height};

    }, [width, height]);

    useEffect(() => {
        // Update range when data changes
        // Side effect: the range is reset when the plot size changes
        if (trajectoryData !== null) {
            setRange({
                x0: minX - xTolerance,
                x1: maxX + xTolerance,
                y0: minY - yTolerance,
                y1: maxY + yTolerance
            });
        }
    }, [trajectoryData, minX, minY, maxX, maxY, xTolerance, yTolerance]);

    function handleUpdate(state) {
        if (state.layout.xaxis.range[0] !== range.x0 || state.layout.xaxis.range[1] !== range.x1 ||
            state.layout.yaxis.range[0] !== range.y0 || state.layout.yaxis.range[1] !== range.y1) {
            const newRange = {
                x0: state.layout.xaxis.range[0],
                x1: state.layout.xaxis.range[1],
                y0: state.layout.yaxis.range[0],
                y1: state.layout.yaxis.range[1]
            }
            let updatedRange = enforcePlotRange(range, newRange, minX - xTolerance, minY - yTolerance, maxX + xTolerance, maxY + yTolerance);
            setRange(updatedRange);
        }
    }


    const arrows = useMemo(() => {
        if (vectors === null || trajectoryData === null || hoveredPoint === null)
            return null;
        const time = trajectoryData[hoveredPoint].time;
        const x = trajectoryData[hoveredPoint].x / 10;
        const y = trajectoryData[hoveredPoint].y / 10;
        const vectorsInTime = getVectorsFromTime(time);
        if(vectorsInTime === undefined)
            return [];
        return [speedArrow(vectorsInTime, x, y), accelerationArrow(vectorsInTime, x, y), tangentialAccelerationArrow(vectorsInTime, x, y), normalAccelerationArrow(vectorsInTime, x, y)]
    }, [vectors, trajectoryData, hoveredPoint, getVectorsFromTime]);


    function handleHover(data) {
        const index = data.points[0].pointIndex;
        setHoveredPoint(index);
    }

    function handleUnhover(data) {
        const index = data.points[0].pointIndex;
        if (hoveredPoint === index)
            setHoveredPoint(hovered => hovered === index ? null : hovered);
    }

    const plotData = useMemo(() =>
        trajectoryData ? [
            {
                x: trajectoryData.map(it => it.x / 10),
                y: trajectoryData.map(it => it.y / 10),
                type: 'scatter',
                mode: 'lines',
                marker: {color: trajectoryColor},
                hoverinfo: 'none'
            }
        ] : null, [trajectoryData]);

    const plotLayout = useMemo(() => {
        return {
            plot_bgcolor: plotStyles.plot_bgcolor,
            paper_bgcolor: plotStyles.paper_bgcolor,
            font: plotStyles.font,

            margin: {r: 0, t: 0, b: 0, l: 0 },

            width: width,
            height: height,
            xaxis: {
                title: 'X (m)',
                color: plotStyles.axisColor,
                gridcolor: plotStyles.gridColor,
                gridwidth: 1,
                range: [range.x0, range.x1],
                dtick: 200,
            },
            yaxis: {
                title: 'Y (m)',
                color: plotStyles.axisColor,
                gridcolor: plotStyles.gridColor,
                gridwidth: plotStyles.axisGridwidth,
                range: [range.y0, range.y1],
                dtick: 200,
            },
            dragmode: "pan",
            annotations: arrows
        }
    }, [width, height, arrows, range]);


    return (
        <div className={className + " overflow-clip"} ref={ref}>
            {trajectoryData === null ? <div className="h-full w-full flex items-center justify-center"><OrbitProgress size='large' color="#EFE2E2" variant='dotted'/></div>
                :<Plot className="w-full h-full"
                      data={plotData}
                      config={{
                          scrollZoom: true,
                          responsive: true,
                          displayModeBar: false,
                          doubleClick: 'reset'
                      }}
                      layout={plotLayout}
                      onHover={handleHover}
                      onUnhover={handleUnhover}
                      onUpdate={handleUpdate}
                />
            }
        </div>
    )
}