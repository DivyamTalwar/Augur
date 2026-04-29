/**
 * Centralized icon surface — HugeIcons free pack with friendly aliases.
 * Components import { Icon, FooIcon } from "@/components/ui/icon".
 */
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  BrainIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  Building03Icon,
  BulbIcon,
  Calendar03Icon,
  Calendar04Icon,
  CalendarCheckIn01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  ChartBarLineIcon,
  CheckmarkCircle02Icon,
  ChromeIcon,
  CircleIcon,
  Clock01Icon,
  CommandIcon,
  Comment01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  EarthIcon,
  File01Icon,
  FilterIcon,
  FlashIcon,
  FloppyDiskIcon,
  InformationCircleIcon,
  Linkedin01Icon,
  LinkSquare02Icon,
  Loading03Icon,
  Location01Icon,
  Mail01Icon,
  MagicWand01Icon,
  Message01Icon,
  MinusSignIcon,
  MoreVerticalIcon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  RecordIcon,
  RefreshIcon,
  Search01Icon,
  Settings01Icon,
  StarIcon,
  StarsIcon,
  StopIcon,
  Target02Icon,
  TestTube01Icon,
  TextIcon,
  ThumbsDownIcon,
  Tick02Icon,
  User02Icon,
  UserGroupIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";

export const Icon = HugeiconsIcon;

export const AlertIcon = Alert01Icon;
export const ArrowDownIcon = ArrowDown01Icon;
export const ArrowLeftIcon = ArrowLeft01Icon;
export const ArrowRightIcon = ArrowRight01Icon;
export const ArrowUpIcon = ArrowUp01Icon;
export const BoltIcon = FlashIcon;
export { BrainIcon };
export const BriefcaseIcon = Briefcase01Icon;
export const BubbleChatIconAlias = BubbleChatIcon;
export const BuildingIcon = Building03Icon;
export { BulbIcon };
export const CalendarIcon = Calendar03Icon;
export const CalendarEventIcon = Calendar04Icon;
export const CalendarCheckIcon = CalendarCheckIn01Icon;
export const CancelIcon = Cancel01Icon;
export const CancelCircleIconAlias = CancelCircleIcon;
export const ChartBarIcon = ChartBarLineIcon;
export const CheckCircleIcon = CheckmarkCircle02Icon;
export { ChromeIcon };
export const ChevronDownIcon = ArrowDown01Icon;
export const ChevronLeftIcon = ArrowLeft01Icon;
export const ChevronRightIcon = ArrowRight01Icon;
export const ChevronUpIcon = ArrowUp01Icon;
export const CircleIconAlias = CircleIcon;
export const CircleDotIcon = RecordIcon;
export const ClockIcon = Clock01Icon;
export { CommandIcon };
export const CommentIcon = Comment01Icon;
export const CopyIcon = Copy01Icon;
export const DeleteIcon = Delete02Icon;
export const EditIcon = Edit02Icon;
export const ExternalLinkIcon = LinkSquare02Icon;
export const FileTextIcon = File01Icon;
export { FilterIcon };
export const FlaskIcon = TestTube01Icon;
export const FloppyDiskIconAlias = FloppyDiskIcon;
export const GlobeIcon = EarthIcon;
export const InfoIcon = InformationCircleIcon;
export const LinkedinIcon = Linkedin01Icon;
export const LoaderIcon = Loading03Icon;
export const MailIcon = Mail01Icon;
export const MapPinIcon = Location01Icon;
export const MessageIcon = Message01Icon;
export const MessageCircleIcon = BubbleChatIcon;
export const MinusIcon = MinusSignIcon;
export const MoreVerticalIconAlias = MoreVerticalIcon;
export const PauseIconAlias = PauseIcon;
export const PlayIconAlias = PlayIcon;
export const PlusIcon = PlusSignIcon;
export const RefreshIconAlias = RefreshIcon;
export const SaveIcon = FloppyDiskIcon;
export const SearchIcon = Search01Icon;
export const SettingsIcon = Settings01Icon;
export const SparklesIcon = MagicWand01Icon;
export { StarIcon };
export const StopIconAlias = StopIcon;
export const TargetIcon = Target02Icon;
export const TextIconAlias = TextIcon;
export const ThumbsDownIconAlias = ThumbsDownIcon;
export const TickIcon = Tick02Icon;
export const CheckIcon = Tick02Icon;
export const TrashIcon = Delete02Icon;
export const TypographyIcon = TextIcon;
export const UserIcon = User02Icon;
export const UsersIcon = UserGroupIcon;
export const EyeIcon = ViewIcon;
export const EyeOffIcon = ViewOffIcon;

export type IconType = typeof Building03Icon;

/* ────────────────────────────────────────────────────────────────────────
 * Tabler-API adapters
 *
 * Drop-in replacements for `@tabler/icons-react` named imports. Each adapter
 * takes the same `{ className, size, strokeWidth }` props the codebase was
 * already passing to Tabler, so existing JSX (`<IconSearch className="w-4 h-4" />`)
 * keeps working — only the import path changes.
 * ──────────────────────────────────────────────────────────────────────── */
type AdapterProps = {
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
};

const adapt = (data: IconType) => {
  const Component = ({ className, size, strokeWidth, color }: AdapterProps) => (
    <HugeiconsIcon
      icon={data}
      className={className}
      size={typeof size === "number" ? size : undefined}
      strokeWidth={typeof strokeWidth === "number" ? strokeWidth : 1.5}
      color={color}
    />
  );
  Component.displayName = "IconAdapter";
  return Component;
};

// Sorted alphabetically — Tabler name → adapter
export const IconAlertCircle = adapt(InformationCircleIcon);
export const IconAlertTriangle = adapt(Alert01Icon);
export const IconArrowLeft = adapt(ArrowLeft01Icon);
export const IconArrowRight = adapt(ArrowRight01Icon);
export const IconBolt = adapt(FlashIcon);
export const IconBrain = adapt(BrainIcon);
export const IconBrandChrome = adapt(ChromeIcon);
export const IconBrandLinkedin = adapt(Linkedin01Icon);
export const IconBriefcase = adapt(Briefcase01Icon);
export const IconBuilding = adapt(Building03Icon);
export const IconBulb = adapt(BulbIcon);
export const IconCalendar = adapt(Calendar03Icon);
export const IconCalendarCheck = adapt(CalendarCheckIn01Icon);
export const IconCalendarEvent = adapt(Calendar04Icon);
export const IconChartBar = adapt(ChartBarLineIcon);
export const IconCheck = adapt(Tick02Icon);
export const IconChevronDown = adapt(ArrowDown01Icon);
export const IconChevronLeft = adapt(ArrowLeft01Icon);
export const IconChevronRight = adapt(ArrowRight01Icon);
export const IconChevronUp = adapt(ArrowUp01Icon);
export const IconCircle = adapt(CircleIcon);
export const IconCircleCheck = adapt(CheckmarkCircle02Icon);
export const IconCircleDot = adapt(RecordIcon);
export const IconCircleX = adapt(CancelCircleIcon);
export const IconClock = adapt(Clock01Icon);
export const IconCommand = adapt(CommandIcon);
export const IconCopy = adapt(Copy01Icon);
export const IconDeviceFloppy = adapt(FloppyDiskIcon);
export const IconDotsVertical = adapt(MoreVerticalIcon);
export const IconEdit = adapt(Edit02Icon);
export const IconExternalLink = adapt(LinkSquare02Icon);
export const IconEye = adapt(ViewIcon);
export const IconEyeOff = adapt(ViewOffIcon);
export const IconFileText = adapt(File01Icon);
export const IconFilter = adapt(FilterIcon);
export const IconFlask = adapt(TestTube01Icon);
export const IconInfoCircle = adapt(InformationCircleIcon);
export const IconLoader = adapt(Loading03Icon);
export const IconLoader2 = adapt(Loading03Icon);
export const IconMail = adapt(Mail01Icon);
export const IconMapPin = adapt(Location01Icon);
export const IconMessage = adapt(Message01Icon);
export const IconMessageCircle = adapt(BubbleChatIcon);
export const IconMessageReply = adapt(Comment01Icon);
export const IconMessages = adapt(BubbleChatIcon);
export const IconMinus = adapt(MinusSignIcon);
export const IconPhone = adapt(Mail01Icon); // free pack lacks dedicated phone glyph; mail is closest contact icon
export const IconPlayerPause = adapt(PauseIcon);
export const IconPlayerPlay = adapt(PlayIcon);
export const IconPlayerStop = adapt(StopIcon);
export const IconPlus = adapt(PlusSignIcon);
export const IconRefresh = adapt(RefreshIcon);
export const IconSearch = adapt(Search01Icon);
export const IconSettings = adapt(Settings01Icon);
export const IconSparkles = adapt(MagicWand01Icon);
export const IconStar = adapt(StarIcon);
export const IconTargetArrow = adapt(Target02Icon);
export const IconThumbDown = adapt(ThumbsDownIcon);
export const IconTrophy = adapt(StarsIcon);
export const IconTrash = adapt(Delete02Icon);
export const IconTypography = adapt(TextIcon);
export const IconUser = adapt(User02Icon);
export const IconUsers = adapt(UserGroupIcon);
export const IconWorld = adapt(EarthIcon);
export const IconX = adapt(Cancel01Icon);
