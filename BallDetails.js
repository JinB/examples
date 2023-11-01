import React, {Component, Fragment} from "react";
import {observable} from "mobx";
import {setter} from "mobx-decorators";
import {inject, observer} from "mobx-react";
import {withStyles} from "@material-ui/core/styles";
import PropTypes from "prop-types";
import differenceInCalendarDays from "date-fns/differenceInCalendarDays";

import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import FavoriteBorderIcon from "@material-ui/icons/FavoriteBorder";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ScheduleIcon from '@material-ui/icons/Schedule';
import FCFSComponent from "components/FCFSComponent";
import {QuestionButton} from "components/QuestionTooltip";

import DatesDisplay from "components/DatesDisplay";
import PhoneDisplay from "components/PhoneDisplay";
import EmailDisplay from "components/EmailDisplay";
import OverlayLoader from "components/OverlayLoader";
import {formatDateToLongString, formatTimeToLocalTime} from "utils/date";
import {phoneFormatInternational} from "utils/unitsConverter";
import currencies from "utils/currencies.json";
import {FormHelperText, Input} from "@material-ui/core";
import parse from "html-react-parser";
import converter from "number-to-words";

@inject("store")
@observer
class BallDetails extends Component {
    @setter @observable isProcessing = false
    @setter @observable isInputError = false
    @setter @observable inputErrorMsg = ''
    @setter @observable customAmountInfo
    @setter @observable isConfirmationDialogOpened = false
    customAmountInputRef = React.createRef()

    constructor(props) {
        super(props);
        let { store } = this.props;
        let { mapStore, ballDetailsStore } = store;
        let { selectedBallId } = mapStore;
        let selectedBall = ballDetailsStore.findById(selectedBallId);
        this.customAmount = selectedBall.price.amount
        this.ballBasePrice = (selectedBall.baseFares || [selectedBall]).map( x => x.price.amount ).reduce( (a,b) => a+b, 0)
        this.ballChargePrice = (selectedBall.charges || []).map( x => x.price.amount ).reduce( (a,b) => a+b, 0)
        this.ballMinTotalPrice = selectedBall.price.amount
        this.resetCustomAmountInfo()
    }

    donationAmountMsg = () => {
        if( this.ballChargePrice > 0 ) {
            return `Donation per diver: $${this.ballBasePrice} + $${this.ballChargePrice} fee`
        } else {
            return `Donation per diver: $${this.ballBasePrice}`
        }
    }

    onClose = () => {
        const {
            store: { view }
        } = this.props;
        view.navigateTo(view.pages.map);
    };

    handleReservationClick = () => {
        if (this.customAmount === undefined || this.customAmount < this.ballMinTotalPrice) {
            if (this.customAmount === undefined || this.customAmount < 0) {
                this.setInputErrorMsg('Amount should be positive')
            } else {
                this.setInputErrorMsg(`Minimum possible amount is $${this.ballMinTotalPrice}`)
            }
            this.setIsInputError(true)
            this.customAmountInputRef.current.focus()
            return
        }
        if (this.customAmount>200) {
            this.setIsConfirmationDialogOpened(true)
        } else {
            this.confirmAmountConfirmationDialog()
        }
    };

    handleViewReservationClick = ball => {
        let {
            store: { view }
        } = this.props;
        view.navigateTo(view.pages.reservationDetails, {
            id: ball.reservationInfo.reservationId
        });
    };

    handleFavoriteClick = ball => {
        ball.toggleFavorite();
    };

    openHelpMessage = ball => () => {
        this.props.store.view.route.actions.showHelpOnProblem(ball);
    };

    handleAmountChange = (amount) => {
        if (amount.length >3) {
            this.customAmountInputRef.current.value = this.customAmount
            this.customAmountInputRef.current.focus()
            return
        }
        this.setIsInputError(false)
        this.customAmount = amount
        if (amount === '') {
            this.resetCustomAmountInfo()
        } else {
            this.setCustomAmountInfo(parse(`${this.donationAmountMsg()}<br/>Custom donation: $${amount}`))
        }
    };

    setAmountByDivers = (e) => {
        const newPrice = this.ballBasePrice * e + this.ballChargePrice
        this.handleAmountChange(newPrice)
        this.setCustomAmountInfo(parse(`${this.donationAmountMsg()}<br/>Divers: ${e}, total: $${newPrice}`))
        this.customAmountInputRef.current.value = newPrice
        this.customAmountInputRef.current.focus()
    }

    handleAmountKeyPress = (event) => {
        event.preventDefault()
        const digitTyped = parseInt(event.key)
        if (digitTyped >= 0 && digitTyped<=9) {
            const possibleAmount = (this.customAmount===undefined)?digitTyped:parseInt(String(this.customAmount) + digitTyped)
            if (possibleAmount === 0) {
                this.customAmountInputRef.current.value = ''
                this.resetCustomAmountInfo()
                return
            }
            if (String(possibleAmount).length < 4) {
                this.customAmount = (this.customAmount===undefined)?event.key:possibleAmount
                this.customAmountInputRef.current.value = this.customAmount
                this.setCustomAmountInfo(parse(`${this.donationAmountMsg()}<br/>Custom donation: $${this.customAmount}`))
            }
        }
        if (event.key === 'Enter') {
            this.handleReservationClick()
        }
    }

    resetCustomAmountInfo(){
        this.setCustomAmountInfo(parse(`${this.donationAmountMsg()}<br/>Select the number of divers or enter custom amount to donate`))
    }

    closeAmountConfirmationDialog = () => {
        this.setIsConfirmationDialogOpened(false)
    }

    confirmAmountConfirmationDialog = () =>{
        this.setIsConfirmationDialogOpened(false)
        this.setIsProcessing(true);
        this.props.store.view.route.actions.handleReserve(this.customAmount).catch(err => {
            this.setIsProcessing(false);
        });

    }

    renderBall = selectedBall => {
        let { classes, store } = this.props;
        let { authStore, mapStore } = store;

        let isFavoriteBall = selectedBall.isFavorite;
        let isBallInUserReservations =
            selectedBall.isReserved &&
            (selectedBall.reservationInfo.isOwnUnpaidReservation ||
                selectedBall.reservationInfo.isOwnBookedReservation);

        let isDisabled =
            this.isProcessing ||
            (!selectedBall.availabilityStatus.canBeReserved && !isBallInUserReservations);
        let isFCFS = (selectedBall.ballType === 'fcfs' || selectedBall.ballType === 'daytime_only' || selectedBall.ballType === 'daytime_donation')
        const { company } = selectedBall;

        let {from, to} = mapStore;
        const periodDuration = differenceInCalendarDays(to, from);
        const periodName = selectedBall.ballType.startsWith('daytime') ? 'day' : 'night'
        const durationLabel = `${periodDuration} ${periodName}${periodDuration > 1 ? "s" : ""}`;
        const datesLabel = isBallInUserReservations?`${formatDateToLongString(selectedBall.reservationInfo.reservationStartDate)} - ${formatDateToLongString(selectedBall.reservationInfo.reservationEndDate)}`:
            selectedBall.ballType.startsWith('daytime') ? formatDateToLongString(from) : `${formatDateToLongString(from)} - ${formatDateToLongString(to)}`;
        const ballTitle = function(ball) {
            switch( ball.ballType ) {
                case 'fcfs':
                    return `First Come First Serve Mooring at ${ball.locationPath}`
                case 'daytime_only':
                    return `Day Use Only Mooring at ${ball.locationPath}`
                case 'daytime_donation':
                    return `Day Use Only donation Mooring at ${ball.locationPath}`
                case 'reservable':
                    return `#${selectedBall.number}, Reservable Mooring at ${selectedBall.locationPath}`
                default:
                    return `Mooring at ${selectedBall.locationPath}`
            }
        }
        const isDonation = this.ballType === 'daytime_donation'
        return (
            <Fragment>
                {this.isProcessing && <OverlayLoader />}
                <section className={`${classes.contentContainer} ${classes.detailsHeader}`}>
                    <div>
                        <Typography className={classes.detailsTitle} variant={"h6"}>
                            {ballTitle(selectedBall)}
                        </Typography>
                        <FCFSComponent item={selectedBall}/>
                    </div>
                    <IconButton
                        aria-label="Add to favorites"
                        disabled={!authStore.isLoggedIn}
                        color="primary"
                        onClick={this.handleFavoriteClick.bind(null, selectedBall)}
                    >
                        {isFavoriteBall ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                </section>

                <section className={`${classes.contentContainer} ${classes.detailsOwnerSection}`}>
                    <Typography variant="body1" className={classes.ownerSectionTitle}>
                        Location: {company.name}
                    </Typography>
                    {company.phone && <PhoneDisplay phone={phoneFormatInternational(company.phone)} />}
                    {company.email && <EmailDisplay email={company.email} />}
                    <DatesDisplay dates={datesLabel} />
                    {!isBallInUserReservations && !isFCFS && selectedBall.checkInTime && selectedBall.checkoutTime && (
                    <div className={classes.checkInfoContainer}>
                        <ScheduleIcon fontSize="inherit" className={classes.iconStyle} />
                        <Typography>
                            {`${formatTimeToLocalTime(selectedBall.checkInTime)} - ${formatTimeToLocalTime(selectedBall.checkoutTime)}`}
                        </Typography>
                    </div>
                    )}
                </section>
                {isDonation && (
                    <>
                        <div style={{display: "flex", margin: "0px 16px"}}>
                            <Typography style={{fontSize: "1rem"}}>
                                {this.customAmountInfo}
                            </Typography>
                        </div>
                        <div style={{display: "flex", margin: "0px 16px"}}>
                            {this.diversAmountContainer()}
                        </div>
                    </>
                )}
                <section className={classes.detailsActions}>
                    {isBallInUserReservations && (
                        <Button
                            variant={"contained"}
                            fullWidth
                            size="large"
                            disabled={isDisabled}
                            color="primary"
                            onClick={this.handleViewReservationClick.bind(null, selectedBall)}
                            className={classes.actionDetailsButton}
                        >
                            Reservation details
                        </Button>
                    )}
                    {!isBallInUserReservations && (
                        <Fragment>
                            <div className={classes.priceSubContainer}>
                                <div className={classes.priceTotalContainer} style={isDonation?{alignItems: "left"}:{alignItems: "center"}}>
                                    {!isDonation ? this.getPriceInfo(selectedBall, durationLabel) : this.getPriceInput(selectedBall)}
                                </div>
                            </div>
                            <Button
                                variant={"contained"}
                                fullWidth
                                size="large"
                                disabled={isDisabled}
                                color="primary"
                                onClick={isDonation?this.handleReservationClick:this.confirmAmountConfirmationDialog}
                                className={classes.actionButton}
                            >
                                {isFCFS ? "Pay" : "Reserve"}
                            </Button>
                        </Fragment>
                    )}
                    {isDisabled && <QuestionButton onClick={this.openHelpMessage(selectedBall)} />}
                </section>
                {this.customAmount!==undefined && this.customAmount !=='' &&
                    <ConfirmationDialog isDialogOpened={this.isConfirmationDialogOpened} amount={this.customAmount}
                                        onClose={this.closeAmountConfirmationDialog} onConfirm={this.confirmAmountConfirmationDialog}/>}
            </Fragment>
        );
    };

    getPriceInfo = (selectedBall, durationLabel) => {
        const {classes} = this.props;
        return (
            <>
                <Typography variant={"subtitle1"} className={classes.priceTotal}>
                    {currencies[selectedBall.price.currency].symbol}
                    {selectedBall.price.amount}
                </Typography>
                {!selectedBall.ballType.startsWith('daytime') && (
                    <Typography type={"caption"} className={classes.priceDescriptionLabel}>
                        {durationLabel}
                    </Typography>
                )}
            </>
        )
    }

    getPriceInput = (selectedBall) => {
        const {classes} = this.props;
        return (
            <>
                <Typography variant={"subtitle1"} className={classes.priceTotal} style={{display:"flex",alignItems:"baseline"}}>
                    {currencies[selectedBall.price.currency].symbol}
                    <Input
                        type="number"
                        inputRef={this.customAmountInputRef}
                        error={this.isInputError}
                        inputProps={{min: selectedBall.price.amount, max: 1000, 
                            step: (selectedBall.baseFares || [selectedBall]).map(x => x.price.amount).reduce((a,b) => a+b,0), 
                            maxLength: 4}}
                        placeholder={'Amount to donate'}
                        onChange={e => {
                            this.handleAmountChange(e.target.value)
                        }}
                        style={{margin: "0 10px 0 8px", minWidth: "200px", color: "black"}}
                        onKeyPress={e => {
                            this.handleAmountKeyPress(e)
                        }}
                    />
                </Typography>
                {this.isInputError &&
                <FormHelperText style={{color: "red", marginLeft: "8px"}}>{this.inputErrorMsg}</FormHelperText>}
            </>
        )
    }

    diversAmountContainer = () => {
        return (
            <>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px",
                        boxSizing: "border-box",
                    }}
                >
                    <DiversButton value={1} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={2} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={3} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={4} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={5} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={6} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={7} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                    <DiversButton value={8} onClick={e => {
                        this.setAmountByDivers(e)
                    }}/>
                </div>
            </>
        )

    }

    render() {
        let { store } = this.props;
        let { mapStore, ballDetailsStore } = store;
        let { selectedBallId } = mapStore;
        let selectedBall = ballDetailsStore.findById(selectedBallId);
        this.ballType = selectedBall.ballType
        this.ballBasePrice = (selectedBall.baseFares || []).map( x => x.price.amount ).reduce( (a,b) => a+b, 0)
        this.ballChargePrice = (selectedBall.charges || []).map( x => x.price.amount ).reduce( (a,b) => a+b, 0)
        this.ballMinTotalPrice = selectedBall.price.amount

        return <Fragment>{this.renderBall(selectedBall)}</Fragment>;
    }
}

BallDetails.propTypes = {
    classes: PropTypes.object.isRequired
};

const styles = theme => ({
    contentContainer: {
        padding: "16px"
    },
    detailsHeader: {
        background: "#ffffff",
        paddingTop: "30px",
        paddingBottom: "0",
        borderTop: "1px solid #dedede",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    detailsTitle: {
        fontSize: "1.4rem",
        lineHeight: "1em",
        marginBottom: "5px"
    },
    detailsPosition: {
        fontSize: "1rem"
    },
    detailsOwnerSection: {
        paddingBottom: 0,
        paddingTop: 8
    },
    ownerSectionTitle: {
        color: theme.palette.black
    },
    detailsActions: {
        display: "flex",
        flexDirection: "row",
        margin: "12px 16px",
        flex: "1 1 auto",
        alignItems: "center",
        justifyContent: "center"
    },
    actionButton: { marginRight: "5px", flex: 0.6 },
    actionDetailsButton: { marginRight: "5px", flex: 1 },
    iconContainer: {
        display: "flex",
        alignItems: "center",
        fontSize: theme.typography.caption.fontSize
    },
    iconStyle: {
        fontSize: "18px",
        marginRight: "4px",
        color: "#686868"
    },
    priceSubContainer: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 0.5
    },
    checkInfoContainer: {
        display: "flex",
        alignItems: "center",
    },
    priceContainer: {
        textAlign: "center"
    },
    priceTotalContainer: {
        display: "flex",
        flexDirection: "column",
        // alignItems: "center"
    },
    priceTotal: { fontSize: "30px", marginRight: 4 },
    priceDescriptionLabel: { marginTop: -8, textAlign: "left" },

});

function DiversButton(props){
    const {value, onClick} = props
    return (
        <Button
            variant={"contained"}
            color="primary"
            onClick={() => {
                onClick(value)
            }}
            style={{
                maxWidth: '30px', maxHeight: '30px', minWidth: '30px', minHeight: '30px',
                marginRight: "8px",
            }}
        >{value}</Button>
    )
}

class ConfirmationDialog extends Component {
    render() {
        const {isDialogOpened, amount, onClose, onConfirm} = this.props;

        const amountByWords = converter.toWords(amount).toUpperCase()
        const msg = `Please confirm that you really want to donate <br/><b>$${amount}<br/> ${amountByWords}</b><br/>`
        return (
            <Dialog
                open={isDialogOpened}
                onClose={onClose}
                aria-labelledby="warning-dialog-title"
                aria-describedby="warning-dialog-description"
            >
                <DialogTitle id="warning-dialog-title" style={{textAlign:"center"}}>
                    Confirm donation
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="warning-dialog-description" style={{textAlign:"center"}}>
                        {parse(msg)}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary" autoFocus>
                        Close
                    </Button>
                    <Button onClick={onConfirm} color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default withStyles(styles)(BallDetails);
