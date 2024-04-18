import fastapi
import json
from fastapi.middleware.cors import CORSMiddleware
from utilFisica import calcular_vector_velocidad, calcular_vector_aceleracion
from util import timedelta_to_string, timestamp_to_string, string_to_timedelta
from f1data.FastF1Facade import FastF1Facade as FastF1Facade
from placeholders import driversPlaceholder, lapsPlaceholder, trajectoryPlaceholder, vectorsPlaceholder, \
    accelerationsPlaceholder
from scipy.signal import savgol_filter
import pandas as pd
import numpy as np



app = fastapi.FastAPI()
facade = FastF1Facade()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/rounds")
def rounds(year: int = None):
    rounds = facade.rounds(year)
    return [
        {
            "roundNumber": round.roundNumber,
            "country": round.country,
            "location": round.location,
            "eventName": round.eventName,
            "sessions": [
                {
                    "sessionNumber": session.sessionNumber,
                    "name": session.name,
                    "dateUTC": timestamp_to_string(session.date)
                }
                for session in round.sessions
            ]
        }
        for round in rounds
    ]


@app.get("/drivers")
def drivers(year: int, roundNumber: int, sessionNumber: int):
    return [
        {
            "driverNumber": driver.driverNumber,
            "fullName": driver.fullName,
            "countryCode": driver.countryCode,
            "teamName": driver.teamName,
            "teamColor": driver.teamColor
        }
        for driver in facade.drivers(year, roundNumber, sessionNumber)
    ]


@app.get("/laps")
def laps(year: int, roundNumber: int, sessionNumber: int, driverNumber: int):
    return {
        "lapCount": facade.lapCount(year, roundNumber, sessionNumber, driverNumber),
        "fastestLap": facade.fastestLap(year, roundNumber, sessionNumber, driverNumber),
    }


@app.get("/trajectory")
def trajectory(year: int, roundNumber: int, sessionNumber: int, driverNumber: int, lapNumber: int):
    lap_telemetry = facade.telemetry(year, roundNumber, sessionNumber, driverNumber, lapNumber)
    puntos = []
    for index, row in lap_telemetry.iterrows():
        puntos.append({
            "x": row["X"],
            "y": row["Y"],
            "z": row["Z"],
            "time": timedelta_to_string(row["Time"])
        })
    return puntos


@app.get("/vectors")
def accelerations(year: int, roundNumber: int, sessionNumber: int, driverNumber: int, lapNumber: int):
    # Parámetros del filtro de Savitzky-Golay
    window_length = 5
    polyorder = 1

    lap_telemetry = facade.telemetry(year, roundNumber, sessionNumber, driverNumber, lapNumber)
    lap_telemetry['diferencia_tiempo'] = (lap_telemetry['Time'].diff().apply(lambda x: x.total_seconds())).fillna(0)
    lap_telemetry['velocidad_x'] = (lap_telemetry['X'].diff() / lap_telemetry['diferencia_tiempo']).fillna(0)
    lap_telemetry['velocidad_y'] = (lap_telemetry['Y'].diff() / lap_telemetry['diferencia_tiempo']).fillna(0)
    lap_telemetry['velocidad_z'] = (lap_telemetry['Z'].diff() / lap_telemetry['diferencia_tiempo']).fillna(0)
    # Filtrar velocidad con un filtro de Savitzky-Golay
    lap_telemetry['velocidad_x'] = savgol_filter(lap_telemetry['velocidad_x'], window_length, polyorder)
    lap_telemetry['velocidad_y'] = savgol_filter(lap_telemetry['velocidad_y'], window_length, polyorder)
    lap_telemetry['velocidad_z'] = savgol_filter(lap_telemetry['velocidad_z'], window_length, polyorder)
    lap_telemetry['aceleracion_x'] = (lap_telemetry['velocidad_x'].shift(-1) - lap_telemetry['velocidad_x']) / lap_telemetry['diferencia_tiempo']
    lap_telemetry['aceleracion_y'] = (lap_telemetry['velocidad_y'].shift(-1) - lap_telemetry['velocidad_y']) / lap_telemetry['diferencia_tiempo']
    lap_telemetry['aceleracion_z'] = (lap_telemetry['velocidad_z'].shift(-1) - lap_telemetry['velocidad_z']) / lap_telemetry['diferencia_tiempo']
    lap_telemetry['modulo_velocidad_xy'] = np.linalg.norm(lap_telemetry[['velocidad_x', 'velocidad_y']], axis=1)
    lap_telemetry['modulo_velocidad'] = np.linalg.norm(lap_telemetry[['velocidad_x', 'velocidad_y', "velocidad_z"]], axis=1)
    lap_telemetry['modulo_aceleracion'] = np.linalg.norm(lap_telemetry[['aceleracion_x', 'aceleracion_y', "aceleracion_z"]], axis=1)
    lap_telemetry['modulo_aceleracion_xy'] = np.linalg.norm(lap_telemetry[['aceleracion_x', 'aceleracion_y']], axis=1)

    # Calculamos el versor tangente para cada fila
    versor_x_tangente = (lap_telemetry['velocidad_x'] / lap_telemetry['modulo_velocidad_xy']).fillna(0)
    versor_y_tangente = (lap_telemetry['velocidad_y'] / lap_telemetry['modulo_velocidad_xy']).fillna(0)

    # Creamos una nueva columna para el versor tangente
    lap_telemetry['versor_tangente'] = list(zip(versor_x_tangente, versor_y_tangente))

    lap_telemetry['aTangential'] = (
            lap_telemetry['aceleracion_x'] * lap_telemetry['versor_tangente'].apply(lambda x: x[0]) +
            lap_telemetry['aceleracion_y'] * lap_telemetry['versor_tangente'].apply(lambda x: x[1]))

    lap_telemetry['versor_normal_x'] = -lap_telemetry['versor_tangente'].apply(lambda x: x[1])
    lap_telemetry['versor_normal_y'] = lap_telemetry['versor_tangente'].apply(lambda x: x[0])

    # Calculamos la aceleración normal para cada fila
    lap_telemetry['a_normal'] = ((lap_telemetry['aceleracion_x'] * lap_telemetry['versor_normal_x']) +
                (lap_telemetry['aceleracion_y'] * lap_telemetry['versor_normal_y']))

    # Si la aceleración normal es negativa, invertimos el versor normal y la aceleración normal
    a_negativa = lap_telemetry['a_normal'] < 0
    lap_telemetry.loc[a_negativa, 'a_normal'] *= -1
    lap_telemetry.loc[a_negativa, 'versor_normal_x'] *= -1
    lap_telemetry.loc[a_negativa, 'versor_normal_y'] *= -1

    # Eliminar la primera fila
    lap_telemetry = lap_telemetry.iloc[1:]

    # Eliminar la última fila
    lap_telemetry = lap_telemetry.iloc[:-1]

    # Filtrar los datos con un filtro de Savitzky-Golay
    lap_telemetry['aceleracion_x'] = savgol_filter(lap_telemetry['aceleracion_x'], window_length, polyorder)
    lap_telemetry['aceleracion_y'] = savgol_filter(lap_telemetry['aceleracion_y'], window_length, polyorder)
    lap_telemetry['aceleracion_z'] = savgol_filter(lap_telemetry['aceleracion_z'], window_length, polyorder)
    lap_telemetry['modulo_aceleracion'] = savgol_filter(lap_telemetry['modulo_aceleracion'], window_length, polyorder)
    lap_telemetry['modulo_aceleracion_xy'] = savgol_filter(lap_telemetry['modulo_aceleracion_xy'], window_length, polyorder)
    lap_telemetry['aTangential'] = savgol_filter(lap_telemetry['aTangential'], window_length, polyorder)
    lap_telemetry['a_normal'] = savgol_filter(lap_telemetry['a_normal'], window_length, polyorder)

    #Le sacamos la primera fila(primer punto de la vuelta) y la ultima fila(ultimo punto) para que no haya NaN ni valores en Infinito

    aceleraciones = []

    for index, row in lap_telemetry.iterrows():
        aceleraciones.append({
            "time": timedelta_to_string(row["Time"]),
            "versors": {
                "tangent": {
                    "x": row["versor_tangente"][0],
                    "y": row["versor_tangente"][1]
                },
                "normal": {
                    "x": row["versor_normal_x"],
                    "y": row["versor_normal_y"]
                }
            },
            "speed": {
                "vX": row["velocidad_x"],
                "vY": row["velocidad_y"],
                "vZ": row["velocidad_z"],
                "module": row["modulo_velocidad"],
                "moduleXY": row["modulo_velocidad_xy"],
                "speedometer": row["Speed"] / 3.6 * 10
            },
            "acceleration": {
                "aX": row["aceleracion_x"],
                "aY": row["aceleracion_y"],
                "aZ": row["aceleracion_z"],
                "module": row["modulo_aceleracion"],
                "moduleXY": row["modulo_aceleracion_xy"],
                "aTangential": row["aTangential"],
                "aNormal": row["a_normal"]
            }
        })

    return aceleraciones





if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=3002)
