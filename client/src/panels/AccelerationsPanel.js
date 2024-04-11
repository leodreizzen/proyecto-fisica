import AccelerationPlot from "../plots/AccelerationPlot"
import {useGetAcceleration} from "../api/hooks";
import DriverSelector from "./DriverSelector";

export default function AccelerationsPanel({className, sessionData, driver, lap, onDriverChange}){

    const year = sessionData === null ? null : sessionData.year;
    const roundNumber = sessionData === null ? null : sessionData.round;
    const sessionNumber = sessionData === null ? null : sessionData.session;
    const [accelerationData, accelerationDataLoading] = useGetAcceleration(year, roundNumber, sessionNumber, driver, lap);

    return (<div className={className}>
        <DriverSelector sessionData={sessionData} selectedDriver={driver} onDriverChange={onDriverChange}/>
        <AccelerationPlot isDataLoading={accelerationDataLoading} accelerationData={accelerationData} timeUnit={"s"}/>
    </div>);
}