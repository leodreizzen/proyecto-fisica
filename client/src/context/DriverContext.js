import {createContext, useContext, useEffect, useState} from "react";
import {useGetDrivers} from "../api/hooks";

const DriversDataContext = createContext(null);

export function DriverContextProvider({year, round, session, ...props}) {
    const [drivers, driversLoading] = useGetDrivers(year, round, session);
    return <DriverContextProviderInternal drivers={drivers} driversLoading={driversLoading} props={props}
                                          key={`${year} ${round} ${session}`}/>

}

function DriverContextProviderInternal({drivers, driversLoading, props}) {
    const [currentDriver, setCurrentDriver] = useState(null); //Se resetea al cambiar key
    useEffect(() => {
        if (drivers && drivers.length > 0) {
            setCurrentDriver(drivers[0].driverNumber);
        }
    }, [drivers]);
    const value = {
        drivers: drivers,
        driversLoading: driversLoading,
        currentDriver: currentDriver,
        setCurrentDriver: setCurrentDriver
    }
    return <DriversDataContext.Provider value={value} {...props}/>
}

export function useDriverContext() {
    const context = useContext(DriversDataContext);
    if (!context) {
        throw new Error('useDriverContext must be used within a DriverContextProvider');
    }
    return context;
}

export function DriverContextConsumer({children}) {
    return <DriversDataContext.Consumer>
        {value => {
            if (!value) {
                throw new Error('DriverContextConsumer must be used within a DriverContextProvider');
            }
            return children(value)
        }
        }
    </DriversDataContext.Consumer>
}

