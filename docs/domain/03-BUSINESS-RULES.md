# Regole di business

## Cliente

- un cliente può essere persona o azienda;
- una azienda può avere più referenti;
- codice fiscale e P.IVA devono essere normalizzati;
- la duplicazione deve essere verificata prima della creazione;
- ogni modifica significativa genera audit.

## Contratto

- deve avere almeno un cliente;
- deve avere operatore, categoria e stato;
- può contenere più linee e più servizi;
- il numero contratto può non essere globalmente univoco, ma deve esserlo per operatore;
- ogni cambio stato genera timeline.

## SIM

- ICCID deve essere normalizzato;
- una SIM può avere più numerazioni storiche;
- una SIM fisica non può essere assegnata a due servizi attivi contemporaneamente;
- IMEI e ICCID devono essere ricercabili globalmente.

## PDC

- il file originale non viene mai modificato;
- il parser salva il valore, la fonte, la confidenza e la pagina;
- nessun dato dubbio viene importato senza approvazione;
- la P.IVA fornitore 13378520152 deve essere esclusa dall'anagrafica cliente;
- il confronto duplicati è obbligatorio;
- le decisioni dell'utente devono essere registrate.

## Pratiche

- ogni pratica ha tipo, stato, priorità, responsabile e scadenza;
- una pratica bloccata deve avere un motivo;
- una pratica completata non può essere modificata senza riapertura;
- checklist e documenti richiesti dipendono dal tipo pratica.

## Riparazioni

- il dispositivo deve essere identificato;
- accessori consegnati e condizioni estetiche devono essere registrati;
- ogni cambio stato deve essere tracciato;
- la consegna richiede data, operatore e conferma ritiro.
