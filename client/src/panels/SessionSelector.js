import {dateUTC_to_LocalTimezone} from "../client-util";
import {useEffect, useState} from "react";

export default function SessionSelector({className, rounds, onLoadDataClick}) {
    const [selectedRound, setSelectedRound] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        if (rounds !== null && rounds.length > 0) {
            setSelectedRound(0);
            setSelectedSession(0);
        }
    }, [rounds]);


    const roundsLoaded = rounds !== null;

    function onRoundChange(event) {
        setSelectedRound(Number(event.target.value))
    }

    function onSessionChange(event) {
        setSelectedSession(Number(event.target.value))
    }

    function onLoadClick() {
        const round = rounds[selectedRound];
        const session = round.sessions[selectedSession];
        onLoadDataClick(round.roundNumber, session.sessionNumber)
    }



    return <div className={className}>
        <label className={"block mb-1 mt-5 text-white"} htmlFor="ronda">Ronda</label>
        <select value={selectedRound ? selectedRound : ""}
                className={"block w-full border border-gray-400 rounded-md text-white bg-gray-900"} id="ronda"
                disabled={roundsLoaded ? null : true} onChange={onRoundChange}>
            {rounds ? (rounds.map((round, i) => <option key={round.roundNumber}
                                                        value={i}>{round.roundNumber + " - " + round.eventName + " - " + round.country + " - " + round.location}</option>))
                : null}
        </select>

        <label className={"block mb-1 mt-5 text-white"} htmlFor="sesion">Sesión</label>
        <select value={selectedSession ? selectedSession : ""}
                className={" text-white block w-full border border-gray-400 rounded-md bg-gray-900"} id="sesion"
                disabled={roundsLoaded ? null : true} onChange={onSessionChange}>
            {
                (selectedRound === null || rounds === null) ? null :
                    rounds[selectedRound].sessions.map((session, i) => <option key={session.sessionNumber}
                                                                               value={i}>{session.sessionNumber + " - " + session.name + " - " + dateUTC_to_LocalTimezone(session.dateUTC)} </option>)
            }
        </select>
        <button className={"text-white border border-gray-400 my-5 rounded-md bg-gray-900"}
                disabled={selectedSession === null ? true : null}
                onClick={onLoadClick}>Cargar datos
        </button>
    </div>
}