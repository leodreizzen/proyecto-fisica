import {useGetAcceleration} from "../api/hooks";
import DriverSelector from "./DriverSelector";
import AccelerationPlot from "../plots/AccelerationPlot";
import {useSessionDataContext} from "../context/SessionDataContext";
import LapSelector from "./LapSelector";
import {useDriverContext} from "../context/DriverContext";
import {useLapContext} from "../context/LapContext";
import {OrbitProgress} from "react-loading-indicators";

export default function AccelerationsPanel({className}){
    const {currentDriver} = useDriverContext();
    const {currentLap} = useLapContext();
    const {year, round, session} = useSessionDataContext()
    const [accelerationData, accelerationDataLoading] = useGetAcceleration(year, round, session, currentDriver? currentDriver.driverNumber:null, currentLap);
    return (<div className={className + " flex flex-col items-center overflow-clip h-full"}>
        <DriverSelector/>
        <AccelerationPlot className="grow pt-2" isDataLoading={accelerationDataLoading} accelerationData={accelerationData} timeUnit={"s"}/>
        <LapSelector className="mb-3"/>
    </div>);
}