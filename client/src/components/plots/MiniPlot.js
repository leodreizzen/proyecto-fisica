import Plot from "react-plotly.js";
import {plotStyles, trajectoryColor} from "../../styles";
import {useMemo} from "react";
import {useResizeDetector} from "react-resize-detector";
import {accelerationArrow, normalAccelerationArrow, speedArrow, tangentialAccelerationArrow} from "./arrows";
import {useKinematicVectorsContext} from "../../context/KinematicVectorsContext";
import {getTolerancesPreservingAspectRatio, getTrajectoryExtremes} from "./plot-utils";

export function MiniPlot({className, trajectoryData, hoveredPoint}) {
    const {minX, minY, maxX, maxY} = useMemo(()=>getTrajectoryExtremes(trajectoryData), [trajectoryData]);
    const radius = 0.05;

    const xSize = useMemo(() => maxX - minX, [maxX, minX]);
    const ySize = useMemo(() => maxY - minY, [maxY, minY]);

    const {width, height, ref} = useResizeDetector();
    const {vectors, getKinematicVectorsFromTime} = useKinematicVectorsContext();

    const hoveredPointData = trajectoryData[hoveredPoint];
    const arrows = useMemo(() => {
        if (vectors === null || trajectoryData === null || hoveredPoint === null) {
            return null;
        }
        const time = hoveredPointData.time;
        const x = hoveredPointData.cartesian.x / 10;
        const y = hoveredPointData.cartesian.y / 10;
        const vectorsInTime = getKinematicVectorsFromTime(time);
        if(vectorsInTime === undefined)
            return [];
        return [speedArrow(vectorsInTime, x, y), accelerationArrow(vectorsInTime, x, y), tangentialAccelerationArrow(vectorsInTime, x, y), normalAccelerationArrow(vectorsInTime, x, y)]
    }, [vectors, trajectoryData, hoveredPoint, getKinematicVectorsFromTime]);


    let range = {
        x0: trajectoryData[hoveredPoint].cartesian.x / 10 - xSize * radius,
        x1: trajectoryData[hoveredPoint].cartesian.x / 10 + ySize * radius,
        y0: trajectoryData[hoveredPoint].cartesian.y / 10 - xSize * radius,
        y1: trajectoryData[hoveredPoint].cartesian.y / 10 + ySize * radius
    }

    const [xTolerance, yTolerance] = getTolerancesPreservingAspectRatio(range.x0,range.x1,range.y0,range.y1, width, height,0, 0)
    range = {
        x0: range.x0 - xTolerance,
        x1: range.x1 + xTolerance,
        y0: range.y0 - yTolerance,
        y1: range.y1 + yTolerance
    }

    return (
        <div ref={ref} className={className + " overflow-clip"}>
        <Plot
            data={[{
                x: trajectoryData.map(it => it.cartesian.x / 10),
                y: trajectoryData.map(it => it.cartesian.y / 10),
                type: 'scatter',
                mode: 'lines',
                marker: {color: trajectoryColor},
                hoverinfo: 'none'
            }]}

            layout={{
                plot_bgcolor: plotStyles.plot_bgcolor,
                paper_bgcolor: plotStyles.paper_bgcolor,
                font: {...plotStyles.font, size: 10},

                margin: {r: 0, t: 0, b: 0, l: 0},

                xaxis: {
                    title: 'X (m)',
                    color: "transparent",
                    gridcolor: plotStyles.gridColor,
                    gridwidth: 1,
                    range: [range.x0, range.x1],
                    dtick: 50,

                },
                yaxis: {
                    title: 'Y (m)',
                    color: "transparent",
                    gridcolor: plotStyles.gridColor,
                    gridwidth: plotStyles.axisGridwidth,
                    range: [range.y0, range.y1],
                    dtick: 50,
                },
                dragmode: false,
                height: height,
                width: width,
                annotations: arrows
            }}
            config={{
                scrollZoom: false,
                responsive: true,
                displayModeBar: false,
                doubleClick: 'none'
            }}
        />
        </div>
    )
}