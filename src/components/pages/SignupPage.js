import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import PlansSection from '../common/PlansSection';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import CalculateDiscount from '../../utils/discount';

const React = require('react');

export const SignupPageStyles = `
    footer.gh-portal-signup-footer,
    footer.gh-portal-signin-footer {
        height: 112px;
    }

    .gh-portal-content.signup,
    .gh-portal-content.signin {
        max-height: calc(100vh - 12vw - 112px);
        padding-bottom: 0;
    }

    .gh-portal-signup-logo {
        position: relative;
        display: block;
        background-position: 50%;
        background-size: cover;
        border-radius: 2px;
        width: 56px;
        height: 56px;
        margin: 12px 0 10px;
    }

    .gh-portal-signup-header,
    .gh-portal-signin-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 32px 24px;
    }

    .gh-portal-signup-header.nodivider {
        border: none;
        margin-bottom: 0;
    }

    .gh-portal-signup-message {
        display: flex;
        justify-content: center;
        color: var(--grey4);
        font-size: 1.3rem;
        letter-spacing: 0.2px;
        margin-top: 8px;
    }

    .gh-portal-signup-message button {
        font-size: 1.3rem;
        font-weight: 400;
        margin-left: 4px;
    }
`;

class SignupPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'Free'
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (member) {
            this.context.onAction('switchPage', {
                page: 'accountHome'
            });
        }

        // Handle the default plan if not set
        const plans = this.getPlans();
        const selectedPlan = this.state.plan;
        const defaultSelectedPlan = this.getDefaultSelectedPlan(plans, this.state.plan);
        if (defaultSelectedPlan !== selectedPlan) {
            this.setState({
                plan: defaultSelectedPlan
            });
        }
    }

    componentDidUpdate() {
        // Handle the default plan if not set
        const plans = this.getPlans();
        const selectedPlan = this.state.plan;
        const defaultSelectedPlan = this.getDefaultSelectedPlan(plans, this.state.plan);
        if (defaultSelectedPlan !== selectedPlan) {
            this.setState({
                plan: defaultSelectedPlan
            });
        }
    }

    handleSignup(e) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, () => {
            const {onAction} = this.context;
            const {name, email, plan, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                onAction('signup', {name, email, plan});
                this.setState({
                    errors: {}
                });
            }
        });
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        const value = e.target.value;
        this.setState({
            [fieldName]: value
        });
    }

    handleInputBlur(e, field) {
        this.setState((state) => {
            const fieldErrors = ValidateInputForm({fields: this.getInputFields({state, fieldNames: [field.name]})}) || {};
            return {
                errors: {
                    ...(state.errors || {}),
                    ...fieldErrors
                }
            };
        });
    }

    handleSelectPlan(e, name) {
        e.preventDefault();
        // Hack: React checkbox gets out of sync with dom state with instant update
        setTimeout(() => {
            this.setState((prevState) => {
                return {
                    plan: name
                };
            });
        }, 5);
    }

    getDefaultSelectedPlan(plans = [], selectedPlan) {
        if (!plans || plans.length === 0) {
            return 'Free';
        }

        const hasSelectedPlan = plans.some((p) => {
            return p.name === selectedPlan;
        });

        if (!hasSelectedPlan) {
            return plans[0].name || 'Free';
        }

        return selectedPlan;
    }

    getPlans() {
        const {
            plans,
            allow_self_signup: allowSelfSignup,
            is_stripe_configured: isStripeConfigured,
            portal_plans: portalPlans
        } = this.context.site;

        const plansData = [];
        const discount = CalculateDiscount(plans.monthly, plans.yearly);
        const stripePlans = [
            {
                type: 'month',
                price: plans.monthly,
                currency: plans.currency_symbol,
                name: 'Monthly'
            },
            {
                type: 'year',
                price: plans.yearly,
                currency: plans.currency_symbol,
                name: 'Yearly',
                discount
            }
        ];

        if (allowSelfSignup && (portalPlans === undefined || portalPlans.includes('free'))) {
            plansData.push({type: 'free', price: 0, currency: plans.currency_symbol, name: 'Free'});
        }

        if (isStripeConfigured) {
            stripePlans.forEach((plan) => {
                if (portalPlans === undefined || portalPlans.includes(plan.name.toLowerCase())) {
                    plansData.push(plan);
                }
            });
        }

        return plansData;
    }

    getInputFields({state, fieldNames}) {
        const {portal_name: portalName} = this.context.site;

        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: state.email,
                placeholder: 'jamie@example.com',
                label: 'Email',
                name: 'email',
                required: true,
                errorMessage: errors.email || ''
            }
        ];

        /** Show Name field if portal option is set*/
        if (portalName) {
            fields.unshift({
                type: 'text',
                value: state.name,
                placeholder: 'Jamie Larson',
                label: 'Name',
                name: 'name',
                required: true,
                errorMessage: errors.name || ''
            });
        }
        if (fieldNames && fieldNames.length > 0) {
            return fields.filter((f) => {
                return fieldNames.includes(f.name);
            });
        }
        return fields;
    }

    renderSubmitButton() {
        const {action, brandColor} = this.context;
        const plans = this.getPlans();

        let label = 'Continue';
        if (!plans || plans.length === 0 || (plans.length === 1 && plans[0].type === 'free')) {
            label = 'Sign up';
        }

        let isRunning = false;
        if (action === 'signup:running') {
            label = 'Sending...';
            isRunning = true;
        }
        let retry = false;
        if (action === 'signup:failed') {
            label = 'Retry';
            retry = true;
        }

        const disabled = (action === 'signup:running') ? true : false;
        return (
            <ActionButton
                style={{width: '100%'}}
                retry={retry}
                onClick={e => this.handleSignup(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
                isRunning={isRunning}
            />
        );
    }

    renderPlans() {
        const plansData = this.getPlans();
        const plansContainerClass = plansData.length <= 1 ? 'gh-portal-signup-singleplan' : 'gh-portal-signup-multiplan';

        return (
            <div className={plansContainerClass}>
                <PlansSection
                    plans={plansData}
                    selectedPlan={this.state.plan}
                    onPlanSelect={(e, name) => this.handleSelectPlan(e, name)}
                />
            </div>
        );
    }

    renderLoginMessage() {
        const {brandColor, onAction} = this.context;
        return (
            <div className='gh-portal-signup-message'>
                <div>Already a member?</div>
                <button
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => onAction('switchPage', {page: 'signin'})}
                >
                    Log in
                </button>
            </div>
        );
    }

    renderForm() {
        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={this.getInputFields({state: this.state})}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onBlur={(e, field) => this.handleInputBlur(e, field)}
                    />
                    {this.renderPlans()}
                </div>
            </section>
        );
    }

    renderSiteLogo() {
        const {site} = this.context;
        const siteLogo = site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <span className='gh-portal-signup-logo' style={logoStyle}> </span>
            );
        }
        return null;
    }

    renderFormHeader() {
        const {site} = this.context;
        const siteTitle = site.title || 'Site Title';

        return (
            <header className='gh-portal-signup-header'>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">{siteTitle}</h2>
            </header>
        );
    }

    render() {
        return (
            <div>
                <div className='gh-portal-content signup'>
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
                <footer className='gh-portal-signup-footer'>
                    {this.renderSubmitButton()}
                    {this.renderLoginMessage()}
                </footer>
            </div>
        );
    }
}

export default SignupPage;