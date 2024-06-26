import {plotStyles} from "../../styles";
import {useMemo} from "react";
import BasePlot from "./BasePlot";

function SplitAccelerationPlot({className, timeUnit, traces}) {
    const {moduleTrace, tangentialTrace, normalTrace} = traces;

    const plotLayout = useMemo(() => {
        const xAxisFont = {
            family: plotStyles.font.family,
            size:16,
            color: plotStyles.font.color
        }

        const yAxisFont = {
            family: plotStyles.font.family,
            size:11,
            color: plotStyles.font.color
        }
        return {
            xaxis: {
                title: '',
                titlefont: xAxisFont,
                tolerance: 0.1
            },
            xaxis2: {
                anchor: 'x',
                matches: 'x',
                title: '',
                titlefont: xAxisFont,
                tolerance: 0.1
            },
            xaxis3: {
                anchor: 'x',
                matches: 'x',
                title: 'Tiempo [' + timeUnit + "]",
                titlefont: xAxisFont,
                tolerance: 0.1
            },

            yaxis1: {
                title: '|a| [m/s²]',
                titlefont: yAxisFont,
                tolerance: 0.1

            },
            yaxis2: {
                title: 'a tangencial [m/s²]',
                titlefont: yAxisFont,
                tolerance: 0.1
            },
            yaxis3: {
                title: 'a normal [m/s²]',
                titlefont: yAxisFont,
                tolerance: 0.1
            },
            margin: {t: 20},
            grid: {rows: 3, columns: 1, pattern: 'independent'},
            dragmode: "pan"
        }
    }, [timeUnit])

    return (
            <BasePlot className={className}
                  data={[
                      {...moduleTrace, xaxis: 'x1', yaxis: 'y1', showlegend: false, name:""},
                      {...tangentialTrace, xaxis: 'x2', yaxis: 'y2', showlegend: false, name:""},
                      {...normalTrace, xaxis: 'x3', yaxis: 'y3', showlegend: false, name:""},
                  ]}
                  layout={plotLayout}
                  config={{responsive: true, scrollZoom: true, displayModeBar: false}}/>
    )
}
export default SplitAccelerationPlot;